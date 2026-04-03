import React, { createContext, useContext, useEffect, useReducer } from 'react';

import { fetchMe } from '@/api/auth';
import { clearToken, getToken } from '@/api/client';
import type { User } from '@/types/api';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; token: string; user: User };

type AuthAction =
  | { type: 'LOADED_NO_TOKEN' }
  | { type: 'LOGIN'; token: string; user: User }
  | { type: 'LOGOUT' };

function authReducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADED_NO_TOKEN':
      return { status: 'unauthenticated' };
    case 'LOGIN':
      return { status: 'authenticated', token: action.token, user: action.user };
    case 'LOGOUT':
      return { status: 'unauthenticated' };
    default:
      return { status: 'unauthenticated' };
  }
}

type AuthContextValue = {
  state: AuthState;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { status: 'loading' } as AuthState);

  useEffect(() => {
    let mounted = true;

    async function hydrateAuth() {
      const token = await getToken();
      if (!mounted) {
        return;
      }

      if (!token) {
        dispatch({ type: 'LOADED_NO_TOKEN' });
        return;
      }

      try {
        const user = await fetchMe();
        if (!mounted) {
          return;
        }
        dispatch({ type: 'LOGIN', token, user });
      } catch {
        await clearToken();
        if (mounted) {
          dispatch({ type: 'LOADED_NO_TOKEN' });
        }
      }
    }

    hydrateAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = (token: string, user: User) => {
    dispatch({ type: 'LOGIN', token, user });
  };

  const logout = async () => {
    await clearToken();
    dispatch({ type: 'LOGOUT' });
  };

  return React.createElement(AuthContext.Provider, { value: { state, login, logout } }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
