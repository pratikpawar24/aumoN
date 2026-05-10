import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Initialize from localStorage ────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getCurrentUser();
        const token      = authService.getToken();
        if (storedUser && token) {
          setUser(storedUser);
          // Verify token with backend
          const verified = await authService.verifyToken();
          if (verified.success) setUser(verified.user);
          else                   authService.logout();
        }
      } catch {
        authService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const data = await authService.login(email, password);
    setUser(data.user);
    toast.success(`Welcome back, ${data.user.name}! 👋`);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    setError(null);
    const data = await authService.register(payload);
    setUser(data.user);
    toast.success(`Welcome to AUMO, ${data.user.name}! 🌿`);
    return data;
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    return authService.sendVerification();
  }, []);

  const verifyEmail = useCallback(async (otp) => {
    const data = await authService.verifyEmail(otp);
    if (data.user) setUser(data.user);
    return data;
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    const data = await authService.uploadAvatar(file);
    if (data.user) setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const updateUser = useCallback(async (updates) => {
    const data = await authService.updateProfile(updates);
    setUser(data.user);
    toast.success('Profile updated!');
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await authService.getProfile();
    if (data.user) setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        emailVerified: !!user?.emailVerified,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
        sendVerificationEmail,
        verifyEmail,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;