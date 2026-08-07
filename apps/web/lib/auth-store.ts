'use client';

import { create } from 'zustand';
import { api, setAccessToken } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  login: async (email, password) => {
    set({ status: 'loading' });
    const { accessToken } = await api.post<{ accessToken: string }>('/auth/login', { email, password });
    setAccessToken(accessToken);
    set({ status: 'authenticated' });
  },

  register: async (email, password, name) => {
    set({ status: 'loading' });
    const { accessToken } = await api.post<{ accessToken: string }>('/auth/register', {
      email,
      password,
      name,
    });
    setAccessToken(accessToken);
    set({ status: 'authenticated' });
  },

  logout: async () => {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    set({ user: null, status: 'unauthenticated' });
  },

  hydrate: async () => {
    // El access token vive en memoria/sessionStorage; si no hay uno pero existe
    // la cookie de refresh, el interceptor de `api.ts` la usa automáticamente
    // en la primera request protegida que se haga.
    set({ status: 'idle' });
  },
}));
