import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState(null); // 'owner' | 'employee' | null

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    try {
      // Try owner session first
      const res = await axios.get(`${API}/api/auth/me`, { withCredentials: true });
      setUser({ ...res.data.user, isEmployee: false });
      setAuthType('owner');
      setIsAuthenticated(true);
    } catch {
      try {
        // Try employee session
        const res = await axios.get(`${API}/api/employees/auth/me`, { withCredentials: true });
        setUser({ ...res.data.employee, isEmployee: true });
        setAuthType('employee');
        setIsAuthenticated(true);
      } catch {
        setUser(null);
        setAuthType(null);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login — loginType: 'owner' | 'employee'
   */
  const login = async (loginId, password, loginType = 'owner') => {
    if (loginType === 'employee') {
      const res = await axios.post(
        `${API}/api/employees/auth/login`,
        { loginId, password },
        { withCredentials: true }
      );
      setUser({ ...res.data.employee, isEmployee: true });
      setAuthType('employee');
      setIsAuthenticated(true);
      return res;
    } else {
      const res = await axios.post(
        `${API}/api/auth/login`,
        { loginId, password },
        { withCredentials: true }
      );
      setUser({ ...res.data.user, isEmployee: false });
      setAuthType('owner');
      setIsAuthenticated(true);
      return res;
    }
  };

  const logout = async () => {
    try {
      const endpoint =
        authType === 'employee' ? '/api/employees/auth/logout' : '/api/auth/logout';
      await axios.post(`${API}${endpoint}`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAuthType(null);
      setIsAuthenticated(false);
    }
  };

  /**
   * canDo('payments', 'edit') → true if owner OR employee has that permission.
   */
  const canDo = (resource, action) => {
    if (authType === 'owner') return true;   // owners can do everything
    if (authType !== 'employee') return false;
    return !!user?.permissions?.[resource]?.[action];
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isEmployee: authType === 'employee',
    isOwner: authType === 'owner',
    authType,
    permissions: user?.permissions || null,
    canDo,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
