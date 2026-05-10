import { io } from 'socket.io-client';
import { API_URL } from '../utils/constants';

let cached = null;

/**
 * Lazily-initialized Socket.IO client. Single connection shared across
 * features (chat, carpool real-time, etc.). Reconnects automatically.
 */
export const getSocket = () => {
  if (cached) return cached;
  cached = io(API_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
  });
  return cached;
};

export const disconnectSocket = () => {
  if (cached) {
    cached.disconnect();
    cached = null;
  }
};
