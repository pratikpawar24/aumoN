import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import authService from '../services/authService';
import { setUnauthorizedHandler } from '../services/api';
import { registerForPush } from '../services/notificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // Restore session on launch and re-verify the token with the backend.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      try {
        const stored = await authService.getStoredUser();
        const token = await authService.getToken();
        if (stored && token) {
          setUser(stored);
          try {
            const res = await authService.verifyToken();
            if (res?.user) setUser(res.user);
          } catch (_) {
            await authService.logout();
            setUser(null);
          }
        }
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  // Once we have a logged-in user, register this device for push and store
  // its Expo token on the account (best-effort).
  useEffect(() => {
    if (!user?._id) return;
    let cancelled = false;
    registerForPush().then((token) => {
      if (!cancelled && token) authService.savePushToken(token);
    });
    return () => { cancelled = true; };
  }, [user?._id]);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    setUser(data.user);
    return data;
  }, []);

  const verifyEmail = useCallback(async (otp) => {
    const data = await authService.verifyEmail(otp);
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await authService.verifyToken();
    if (res?.user) setUser(res.user);
    return res?.user;
  }, []);

  const updateUser = useCallback(async (updates) => {
    const data = await authService.updateProfile(updates);
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    const data = await authService.uploadAvatar(file);
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        booting,
        isAuthenticated: !!user,
        emailVerified: !!user?.emailVerified,
        login,
        register,
        verifyEmail,
        refreshUser,
        updateUser,
        uploadAvatar,
        logout,
        setUser,
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
