import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '@/lib/apiClient';
import { initSocket, disconnectSocket } from '@/lib/socket';
import type { User } from '@/types/api';

export type UserRole = 'admin' | 'hr' | 'employee' | 'client' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userRole: UserRole;
  userName: string;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.getMe();
          if (response.data.success && response.data.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
            // Initialize socket connection
            initSocket(token);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password);
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        setIsAuthenticated(true);
        // Initialize socket connection
        initSocket(token);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    authAPI.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        userRole: user?.role || null,
        userName: user?.name || '',
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
