import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthExpiredHandler, ApiError } from '../lib/api';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  roles?: string[];
  role?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: 'driver' | 'parent' | 'teacher' | 'admin';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveRole(user: User | null): 'driver' | 'parent' | 'teacher' | 'admin' {
  const roles = user?.roles && user.roles.length ? user.roles : [user?.role ?? ''];
  const known = ['driver', 'parent', 'teacher', 'admin'];
  const match = roles.find((r) => known.includes(r));
  if (match === 'driver' || match === 'parent' || match === 'teacher') return match;
  return 'admin';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setAuthExpiredHandler(() => {
      if (!mounted.current) return;
      setUser(null);
      AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
    });
    return () => {
      mounted.current = false;
      setAuthExpiredHandler(() => {});
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [token, cached] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);
        if (token && cached) {
          // Instant restore from cache — no login flash on relaunch
          setUser(JSON.parse(cached));
          setIsLoading(false);
          // Background revalidation; offline is tolerated
          try {
            const me = await api.get<User>('/auth/me');
            if (!mounted.current) return;
            setUser(me);
            await AsyncStorage.setItem('user', JSON.stringify(me));
          } catch (e) {
            if (e instanceof ApiError && e.status === 401 && mounted.current) {
              setUser(null);
              await AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
            }
            // NETWORK errors: keep cached session (offline persistence)
          }
          return;
        }
        if (!token) await AsyncStorage.multiRemove(['refresh_token', 'user']);
      } catch {
        await AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<TokenResponse>('/auth/login', {
      email,
      password,
      tenant_id: 'default',
    });
    await AsyncStorage.setItem('token', res.access_token);
    if (res.refresh_token) await AsyncStorage.setItem('refresh_token', res.refresh_token);
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      await AsyncStorage.setItem('user', JSON.stringify(me));
    } catch (e) {
      await AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = await AsyncStorage.getItem('refresh_token');
      await api.post('/auth/logout', { refresh_token: rt ?? '' });
    } catch {
      // best-effort revocation; always clear local session
    }
    setUser(null);
    await AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        role: resolveRole(user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
