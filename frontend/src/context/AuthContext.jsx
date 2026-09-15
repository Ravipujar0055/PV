import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, getToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      // Check current token
      const token = getToken();
      if (token) {
        try {
          const res = await api.getCurrentUser();
          setUser(res.user);
        } catch {
          console.warn('Session expired or invalid token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (credOrIdentifier, maybePassword) => {
    const payload = typeof credOrIdentifier === 'object' && credOrIdentifier !== null
      ? credOrIdentifier
      : { identifier: credOrIdentifier, password: maybePassword };

    const res = await api.login(payload);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateUserData = (updatedFields) => {
    setUser(prev => ({ ...prev, ...updatedFields }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      updateUserData,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isStudent: user?.role === 'student',
      isRecruiter: user?.role === 'recruiter'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
