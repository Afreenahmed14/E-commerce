import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { getAccessToken } from '../services/api';

export const SocketContext = createContext(null);

/**
 * Realtime context — Feature 4 (chat) and Feature 7 (notifications).
 * Connects to the backend Socket.IO server with the current access token,
 * exposes the socket instance plus connection state, and wires up the
 * `notification:new` event so any page can react to live notifications.
 */
export function SocketProvider({ children }) {
  const { isAuthenticated, role } = useContext(AuthContext);
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      return undefined;
    }

    const token = getAccessToken();
    const baseUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || 'https://e-commerce-zvmh.onrender.com';
    // The backend serves socket.io on the same origin; if the API base URL
    // includes a path, strip it.
    const origin = baseUrl.replace(/\/api\/v\d+$/, '');

    const socket = io(origin, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:online', ({ userId, online }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: online }));
    });
    socket.on('presence:offline', ({ userId, online }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: online }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, role]);

  const joinConversation = useCallback((conversationId) => {
    socketRef.current?.emit('chat:join', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    socketRef.current?.emit('chat:leave', conversationId);
  }, []);

  const sendTyping = useCallback((conversationId, isTyping) => {
    socketRef.current?.emit('chat:typing', { conversationId, isTyping });
  }, []);

  const sendMessage = useCallback((conversationId, text, attachment) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('chat:message', { conversationId, text, attachment }, (ack) => {
        if (ack?.error) reject(new Error(ack.error));
        else resolve(ack?.message);
      });
    });
  }, []);

  const markRead = useCallback((conversationId) => {
    socketRef.current?.emit('chat:read', { conversationId });
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendTyping,
    sendMessage,
    markRead,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
