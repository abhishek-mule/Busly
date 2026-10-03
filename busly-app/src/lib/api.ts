import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, TENANT_ID } from '../config/api';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  _retried?: boolean;
};

let onAuthExpired: (() => void) | null = null;
export function setAuthExpiredHandler(handler: () => void) {
  onAuthExpired = handler;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.access_token) return null;
    await AsyncStorage.setItem('token', data.access_token);
    if (data.refresh_token) await AsyncStorage.setItem('refresh_token', data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function getFreshToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshTokens().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  };

  let token = await AsyncStorage.getItem('token');
  let res: Response;
  try {
    res = await doFetch(token);
    if (res.status === 401 && !options._retried) {
      const newToken = await getFreshToken();
      if (newToken) {
        res = await doFetch(newToken);
      } else {
        onAuthExpired?.();
        throw new ApiError(401, 'SESSION_EXPIRED', 'Your session expired. Please sign in again.');
      }
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection.');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const detail = data?.detail;
    const code = detail?.code ?? detail?.error ?? `HTTP_${res.status}`;
    const message =
      detail?.message ??
      (typeof detail === 'string' ? detail : data?.message) ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, String(code), String(message));
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  tenant: TENANT_ID,
};
