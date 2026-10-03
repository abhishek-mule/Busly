'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, vehiclesAPI, driversAPI, routesAPI, studentsAPI, attendanceAPI, alertsAPI, tripsAPI, stopsAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  role: string;
  roles?: string[];
  phone?: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        const user = JSON.parse(userStr);
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        router.push('/login');
      }
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      router.push('/login');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data } = await authAPI.login({ username: email, password });
      localStorage.setItem('token', data.access_token);

      try {
        const meResponse = await authAPI.me();
        const user = meResponse.data;
        localStorage.setItem('user', JSON.stringify(user));
        setState({ user, isLoading: false, isAuthenticated: true });
        router.push('/dashboard');
      } catch {
        localStorage.removeItem('token');
        return { success: false, error: 'Logged in but could not load your profile' };
      }
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail?.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push('/login');
  };

  return { ...state, login, logout };
}

interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useFetch<T>(
  fetchFn: () => Promise<any>,
  dependencies: any[] = [],
  options?: { immediate?: boolean; cache?: boolean }
) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: options?.immediate ?? true,
    error: null,
  });

  const cacheRef = useRef<Map<string, T>>(new Map());

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const cacheKey = JSON.stringify(dependencies);
      if (options?.cache && cacheRef.current.has(cacheKey)) {
        setState({ data: cacheRef.current.get(cacheKey) as T, isLoading: false, error: null });
        return;
      }
      const response = await fetchFn();
      const raw = response.data;
      // Backend list endpoints return {items, total, page, page_size} — unwrap so callers get arrays.
      const data = Array.isArray(raw) ? raw : (raw?.items ?? raw);
      if (options?.cache) {
        cacheRef.current.set(cacheKey, data);
      }
      setState({ data, isLoading: false, error: null });
    } catch (error: any) {
      setState({ data: null, isLoading: false, error: error.response?.data?.message || 'An error occurred' });
    }
  }, dependencies);

  useEffect(() => {
    if (options?.immediate !== false) {
      execute();
    }
  }, [execute]);

  return { ...state, refetch: execute };
}

export function useVehicles(params?: any) {
  return useFetch(() => vehiclesAPI.list(params), [params]);
}

export function useVehicle(id: string) {
  return useFetch(() => vehiclesAPI.get(id), [id], { immediate: !!id });
}

export function useDrivers(params?: any) {
  return useFetch(() => driversAPI.list(params), [params]);
}

export function useDriver(id: string) {
  return useFetch(() => driversAPI.get(id), [id], { immediate: !!id });
}

export function useRoutes(params?: any) {
  return useFetch(() => routesAPI.list(params), [params]);
}

export function useRoute(id: string) {
  return useFetch(() => routesAPI.get(id), [id], { immediate: !!id });
}

export function useStudents(params?: any) {
  return useFetch(() => studentsAPI.list(params), [params]);
}

export function useStudent(id: string) {
  return useFetch(() => studentsAPI.get(id), [id], { immediate: !!id });
}

export function useStops(params?: any) {
  return useFetch(() => stopsAPI.list(params), [params]);
}

export function useAttendance(params?: any) {
  return useFetch(() => attendanceAPI.daily(params), [params]);
}

export function useAlerts(params?: any) {
  return useFetch(() => alertsAPI.list(params), [params]);
}

export function useTrips(params?: any) {
  return useFetch(() => tripsAPI.list(params), [params]);
}

export function useTrip(id: string) {
  return useFetch(() => tripsAPI.get(id), [id], { immediate: !!id });
}

export function usePagination(initialPage = 1, initialLimit = 20) {
  const [state, setState] = useState({ page: initialPage, limit: initialLimit, total: 0 });
  const setPage = (page: number) => setState(prev => ({ ...prev, page }));
  const setLimit = (limit: number) => setState(prev => ({ ...prev, limit, page: 1 }));
  const setTotal = (total: number) => setState(prev => ({ ...prev, total }));
  const totalPages = Math.ceil(state.total / state.limit);
  const offset = (state.page - 1) * state.limit;
  return { ...state, setPage, setLimit, setTotal, totalPages, offset, hasNextPage: state.page < totalPages, hasPrevPage: state.page > 1 };
}

export function useSearch(initialValue = '', delay = 500) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebouncedValue(value), delay);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [value, delay]);
  return { value, setValue, debouncedValue };
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}
