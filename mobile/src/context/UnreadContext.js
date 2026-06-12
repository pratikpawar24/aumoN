import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import carpoolService from '../services/carpoolService';

// Client-side unread tracking: a thread is "unread" when its last message is
// newer than the last time we opened it AND wasn't sent by us. lastSeen is
// kept per (rideId,peerId) in AsyncStorage; the count is polled every 30s.
const SEEN_KEY = 'aumo_thread_seen';
const POLL_MS = 30000;

const UnreadContext = createContext({ count: 0, markSeen: () => {}, refresh: () => {} });

const loadSeen = async () => {
  try { const s = await AsyncStorage.getItem(SEEN_KEY); return s ? JSON.parse(s) : {}; }
  catch (_) { return {}; }
};

export const UnreadProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);
  const meRef = useRef(null);
  meRef.current = user?._id;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCount(0); return; }
    try {
      const data = await carpoolService.listThreads();
      const seen = await loadSeen();
      const me = String(meRef.current || '');
      const n = (data.threads || []).filter((t) => {
        if (!t.lastSender || String(t.lastSender) === me) return false;
        const key = `${t.rideId}_${t.peerId}`;
        return new Date(t.lastAt).getTime() > (seen[key] || 0);
      }).length;
      setCount(n);
    } catch (_) { /* ignore */ }
  }, [isAuthenticated]);

  const markSeen = useCallback(async (rideId, peerId) => {
    try {
      const seen = await loadSeen();
      seen[`${rideId}_${peerId}`] = Date.now();
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch (_) { /* ignore */ }
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    if (!isAuthenticated) return undefined;
    const id = setInterval(refresh, POLL_MS);
    // Refresh as soon as the app returns to the foreground.
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [isAuthenticated, refresh]);

  return (
    <UnreadContext.Provider value={{ count, markSeen, refresh }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = () => useContext(UnreadContext);
export default UnreadContext;
