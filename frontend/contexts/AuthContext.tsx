import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, handleApiError } from '../utils/api';
import { LoginCredentials, LoginResponse, AuthVerifyResponse } from '../types/api';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verify token on app load
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('auth_token');
      const storedUsername = localStorage.getItem('username');

      if (token && storedUsername) {
        try {
          const response = await api.get<AuthVerifyResponse>('/api/auth/verify');
          if (response.data.valid) {
            setIsAuthenticated(true);
            setUsername(response.data.username);
          } else {
            // Invalid token
            localStorage.removeItem('auth_token');
            localStorage.removeItem('username');
          }
        } catch (error) {
          // Token verification failed
          localStorage.removeItem('auth_token');
          localStorage.removeItem('username');
        }
      }
      setIsLoading(false);
    };

    verifyToken();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', credentials);
      const { token, username: user } = response.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('username', user);

      setIsAuthenticated(true);
      setUsername(user);
    } catch (error: unknown) {
      const errorMessage = handleApiError(error);
      throw new Error(errorMessage || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUsername(null);
  };

  const value = {
    isAuthenticated,
    username,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Protected Route Component
interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Use React Router navigation instead of window.location
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-surface-100 via-surface-50 to-surface-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-surface-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

