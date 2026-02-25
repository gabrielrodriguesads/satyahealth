import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('satya_user');
    const storedToken = localStorage.getItem('satya_token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { user: userData, token } = response.data;
    
    localStorage.setItem('satya_token', token);
    localStorage.setItem('satya_user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { user: userData, token } = response.data;
    
    localStorage.setItem('satya_token', token);
    localStorage.setItem('satya_user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('satya_token');
    localStorage.removeItem('satya_user');
    setUser(null);
  };

  const isSatyaAdmin = user?.role === 'satya_admin';
  const isOperatorAdmin = user?.role === 'operator_admin';
  const isAdmin = isSatyaAdmin || isOperatorAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      isSatyaAdmin,
      isOperatorAdmin,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
