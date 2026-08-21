import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SafeUser, UserRole } from '../types/index.ts';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api.ts';
import { useToast } from './ToastContext.tsx';

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast, error: toastError, success: toastSuccess } = useToast();

  const checkAuth = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.auth.me();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        removeStoredToken();
        setUser(null);
      }
    } catch (err) {
      console.warn('Session check failed or expired');
      removeStoredToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.auth.login({ username, password });
      if (res.success && res.token && res.user) {
        setStoredToken(res.token);
        setUser(res.user);
        toastSuccess(`Selamat datang, ${res.user.Nama}!`, 'Login Berhasil');
        return true;
      }
      return false;
    } catch (err: any) {
      toastError(err.message || 'Gagal login. Periksa username dan password.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn('Logout request warning:', e);
    } finally {
      removeStoredToken();
      setUser(null);
      showToast('Anda telah keluar dari aplikasi SIJAKA.', 'info', 'Logout Berhasil');
    }
  };

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      if (Array.isArray(roles)) {
        return roles.includes(user.Role);
      }
      return user.Role === roles;
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
