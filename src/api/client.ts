import * as SecureStore from 'expo-secure-store';

import { devMockApiRequest } from '@/data/dev-mock';

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'https://api.nnai.app').replace(/\/+$/, '');
const JWT_KEY = 'nnai_jwt';
const DEV_MOCK_API_ENABLED = process.env.EXPO_PUBLIC_DEV_MOCK_API === 'true';
const MOCK_TOKEN = 'mock-token';
const API_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 12000);

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  if (__DEV__ && DEV_MOCK_API_ENABLED && (token === MOCK_TOKEN || token === 'dev-token')) {
    return devMockApiRequest<T>(path, options);
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.detail ?? res.statusText);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  } catch (error: unknown) {
    const errorName =
      typeof error === 'object' && error !== null && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
    if (errorName === 'AbortError') {
      throw new ApiError(408, 'API request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
