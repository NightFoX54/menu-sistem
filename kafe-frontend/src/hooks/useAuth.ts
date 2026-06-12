'use client';

import { create } from 'zustand';
import api from '@/lib/api';

export interface AuthUser {
  userId: number;
  email: string;
  tenantId: number;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  logout: () => void;
}

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.userId,
      email: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const token = localStorage.getItem('token');
    const user = token ? parseJwt(token) : null;
    set({ token, user, hydrated: true });
  },
  login: async (email, password, tenantSlug) => {
    const { data } = await api.post<{ token: string }>('/api/auth/login', { tenantSlug, email, password });
    const user = parseJwt(data.token);
    localStorage.setItem('token', data.token);
    set({ token: data.token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('tenantId');
    set({ token: null, user: null });
  },
}));
