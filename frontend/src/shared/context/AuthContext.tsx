import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api } from '../api/apiClient';

const AUTH_KEY = 'entrelazados_auth';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : { isAuthenticated: false, username: null, token: null };
  });

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post<{ token: string; username: string }>('/auth/login', { username, password });
      const state: AuthState = { isAuthenticated: true, username: res.username, token: res.token };
      localStorage.setItem(AUTH_KEY, JSON.stringify(state));
      setAuth(state);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setAuth({ isAuthenticated: false, username: null, token: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
