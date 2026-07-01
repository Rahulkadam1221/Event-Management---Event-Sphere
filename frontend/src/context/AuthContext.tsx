import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/axios';
import { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  googleLogin: (email: string, name: string, googleId: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setIsLoading(false); return; }
    try {
      const { data } = await api.get<{ data: User }>('/auth/me');
      setUser(data.data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<{ data: AuthResponse }>('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
  };

  const register = async (email: string, password: string, name: string, role?: string) => {
    const { data } = await api.post<{ data: AuthResponse }>('/auth/register', { email, password, name, role });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
  };

  const googleLogin = async (email: string, name: string, googleId: string, avatar?: string) => {
    const { data } = await api.post<{ data: AuthResponse }>('/auth/google', { email, name, googleId, avatar });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
  };

  const logout = async () => {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const updateUser = (updatedUser: User) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, googleLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
