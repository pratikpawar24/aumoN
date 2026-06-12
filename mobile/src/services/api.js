import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG, STORAGE } from '../constants/config';

// Single axios instance. Attaches the JWT from AsyncStorage and clears it on
// a 401. A registered onUnauthorized callback lets the AuthContext react
// (e.g. drop the user back to the login stack).
const api = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem(STORAGE.TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) { /* ignore */ }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([STORAGE.TOKEN, STORAGE.USER]);
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
