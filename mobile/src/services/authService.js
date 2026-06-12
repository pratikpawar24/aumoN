import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { CONFIG, STORAGE } from '../constants/config';

const persist = async (data) => {
  if (data?.token) await AsyncStorage.setItem(STORAGE.TOKEN, data.token);
  if (data?.user) await AsyncStorage.setItem(STORAGE.USER, JSON.stringify(data.user));
};

export const authService = {
  register: async (payload) => {
    const res = await api.post(CONFIG.ENDPOINTS.REGISTER, payload);
    await persist(res.data);
    return res.data;
  },

  login: async (email, password) => {
    const res = await api.post(CONFIG.ENDPOINTS.LOGIN, { email, password });
    await persist(res.data);
    return res.data;
  },

  // JWT-based verification (the real backend infers the user from the token).
  sendVerification: async () => {
    const res = await api.post(CONFIG.ENDPOINTS.SEND_VERIFICATION);
    return res.data;
  },

  verifyEmail: async (otp) => {
    const res = await api.post(CONFIG.ENDPOINTS.VERIFY_EMAIL, { otp });
    if (res.data?.user) {
      await AsyncStorage.setItem(STORAGE.USER, JSON.stringify(res.data.user));
    }
    return res.data;
  },

  verifyToken: async () => {
    const res = await api.get(CONFIG.ENDPOINTS.VERIFY_TOKEN);
    if (res.data?.user) {
      await AsyncStorage.setItem(STORAGE.USER, JSON.stringify(res.data.user));
    }
    return res.data;
  },

  updateProfile: async (updates) => {
    const res = await api.put(CONFIG.ENDPOINTS.PROFILE, updates);
    if (res.data?.user) {
      await AsyncStorage.setItem(STORAGE.USER, JSON.stringify(res.data.user));
    }
    return res.data;
  },

  // file: { uri, name, type } (React Native FormData file shape).
  uploadAvatar: async (file) => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await api.post('/api/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (res.data?.user) {
      await AsyncStorage.setItem(STORAGE.USER, JSON.stringify(res.data.user));
    }
    return res.data;
  },

  getStoredUser: async () => {
    const s = await AsyncStorage.getItem(STORAGE.USER);
    return s ? JSON.parse(s) : null;
  },

  getToken: async () => AsyncStorage.getItem(STORAGE.TOKEN),

  logout: async () => {
    await AsyncStorage.multiRemove([STORAGE.TOKEN, STORAGE.USER]);
  },
};

export default authService;
