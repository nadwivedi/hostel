import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const EmployeeAuthContext = createContext(null);

export const EmployeeAuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/employee/auth/me`,
        { withCredentials: true }
      );
      setEmployee(response.data.employee);
      setIsAuthenticated(true);
    } catch (error) {
      setEmployee(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (loginId, password) => {
    const response = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/api/employee/auth/login`,
      { loginId, password },
      { withCredentials: true }
    );
    setEmployee(response.data.employee);
    setIsAuthenticated(true);
    return response;
  };

  const logout = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/employee/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setEmployee(null);
      setIsAuthenticated(false);
    }
  };

  const hasPermission = (resource, action) => {
    if (!employee?.permissions) return false;
    return employee.permissions[resource]?.[action] || false;
  };

  const hasPropertyAccess = (propertyId) => {
    if (!employee?.assignedProperties) return false;
    return employee.assignedProperties.some(p => p._id === propertyId);
  };

  const value = {
    employee,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
    hasPermission,
    hasPropertyAccess,
    permissions: employee?.permissions || {},
    assignedProperties: employee?.assignedProperties || [],
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
};
