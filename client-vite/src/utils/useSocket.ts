/// <reference types="vite/client" />
/**
 * useSocket.ts
 * Custom hook that manages the Socket.io connection lifecycle.
 *
 * - Connects once when the user is authenticated (token present)
 * - Exposes the socket instance for listening to events in components
 * - Automatically disconnects on unmount / token change
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

// Derive the base socket URL from the API URL env var (strip the /api suffix if present)
const SOCKET_URL = ((import.meta.env.VITE_API_URL as string) || 'http://localhost:5000').replace(/\/api$/, '');

let sharedSocket: Socket | null = null;

/**
 * Returns a singleton Socket.io client.
 * The socket authenticates via JWT and auto-reconnects.
 */
export function getSocket(): Socket {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'], // try WS first, fall back to polling
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return sharedSocket;
}

/**
 * React hook that connects to the socket and returns it.
 * Cleans up (removes listeners, does NOT disconnect the shared socket)
 * so the connection persists across page navigation.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return; // Not authenticated — don't connect

    const socket = getSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Note: We do NOT disconnect here on cleanup — the shared socket
    // stays alive across component unmounts so re-mounts reconnect instantly.
    return () => {
      // Only remove listeners added by this hook instance
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  return socketRef;
}
