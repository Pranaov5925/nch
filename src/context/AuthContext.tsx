'use client';

// NCH 3.0 — Auth Context (real session via /api/auth/*)

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/nch/client';
import type { User, UserRole } from '@/lib/nch/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; phone?: string; address?: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api<{ user: User | null }>('/api/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (data: { name: string; email: string; phone?: string; address?: string; password: string }) => {
    const { user } = await api<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refresh, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const ROLE_HOME: Record<UserRole, string> = {
  consumer: '/consumer/dashboard',
  officer: '/officer/dashboard',
  supervisor: '/supervisor/dashboard',
  company: '/company/dashboard',
};
