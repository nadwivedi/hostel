import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState(null); // 'user' | 'employee' | null

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/me`,
        {
          withCredentials: true,
        }
      );
      setUser(userResponse.data.user);
      setAuthType('user');
      setIsAuthenticated(true);
    } catch (error) {
      try {
        const employeeResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/employee/auth/me`,
          {
            withCredentials: true,
          }
        );
        setUser(employeeResponse.data.employee);
        setAuthType('employee');
        setIsAuthenticated(true);
      } catch (employeeError) {
        setUser(null);
        setAuthType(null);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (loginId, password) => {
    try {
      const userResponse = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/login`,
        { loginId, password },
        {
          withCredentials: true,
        }
      );
      setUser(userResponse.data.user);
      setAuthType('user');
      setIsAuthenticated(true);
      return userResponse;
    } catch (userError) {
      const employeeResponse = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/employee/auth/login`,
        { loginId, password },
        {
          withCredentials: true,
        }
      );
      setUser(employeeResponse.data.employee);
      setAuthType('employee');
      setIsAuthenticated(true);
      return employeeResponse;
    }
  };

  const logout = async () => {
    try {
      const endpoint =
        authType === 'employee'
          ? '/api/employee/auth/logout'
          : '/api/auth/logout';
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}${endpoint}`,
        {},
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAuthType(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isEmployee: authType === 'employee',
    authType,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
