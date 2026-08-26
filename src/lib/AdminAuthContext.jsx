import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('admin-token');
    if (storedToken) {
      setToken(storedToken);
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = useCallback(async (adminToken) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.data || data.admin);
        setToken(adminToken);
      } else {
        localStorage.removeItem('admin-token');
        setToken(null);
        setAdmin(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('admin-token');
      setToken(null);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  const login = useCallback(
    async (email, password) => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const apiResponse = await response.json();
        const { token, admin } = apiResponse.data;
        localStorage.setItem('admin-token', token);
        setToken(token);
        setAdmin(admin);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    [API_BASE]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (token) {
        await fetch(`${API_BASE}/api/admin/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('admin-token');
      setToken(null);
      setAdmin(null);
      setIsLoading(false);
    }
  }, [token, API_BASE]);

  const value = {
    admin,
    token,
    isLoading,
    isAuthenticated: !!token && !!admin,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
