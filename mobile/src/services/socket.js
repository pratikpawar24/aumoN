import { io } from 'socket.io-client';
import { CONFIG } from '../constants/config';

// Single shared Socket.IO connection (chat real-time). The backend emits to
// `chat_<rideId>` rooms; we join via 'join-chat-room'.
let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(CONFIG.API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
