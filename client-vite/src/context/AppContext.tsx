// @ts-nocheck
/**
 * context/AppContext.jsx
 *
 * Centralises the three pieces of global state that multiple components
 * currently fetch independently:
 *   - user          — authenticated user object
 *   - connections   — friends / sentRequests / receivedRequests
 *   - meetings      — all meetings for the current user
 *
 * Any component can consume this context with the useApp() hook instead of
 * fetching the same data in multiple places.
 *
 * Usage:
 *   const { user, connections, meetings, refreshConnections, refreshMeetings, login, logout } = useApp();
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken } from '../utils/auth';

const API = import.meta.env.VITE_API_URL;

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // ── Connections ─────────────────────────────────────────────────────────
  const [connections, setConnections] = useState({
    friends: [],
    sentRequests: [],
    receivedRequests: [],
  });
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const refreshConnections = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setConnectionsLoading(true);
    try {
      const res = await fetch(`${API}/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch connections');
      setConnections(await res.json());
    } catch (err) {
      console.error('[AppContext] connections fetch failed:', err.message);
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  // ── Meetings ────────────────────────────────────────────────────────────
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);

  const refreshMeetings = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setMeetingsLoading(true);
    try {
      const res = await fetch(`${API}/meetings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch meetings');
      setMeetings(await res.json());
    } catch (err) {
      console.error('[AppContext] meetings fetch failed:', err.message);
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  // ── Initial load when user changes ──────────────────────────────────────
  useEffect(() => {
    if (user) {
      refreshConnections();
      refreshMeetings();
    } else {
      setConnections({ friends: [], sentRequests: [], receivedRequests: [] });
      setMeetings([]);
    }
  }, [user, refreshConnections, refreshMeetings]);

  // ── Auth helpers ────────────────────────────────────────────────────────
  const login = useCallback((userData) => {
    setUser(userData.user);
    localStorage.setItem('user', JSON.stringify(userData.user));
    localStorage.setItem('token', userData.token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setConnections({ friends: [], sentRequests: [], receivedRequests: [] });
    setMeetings([]);
  }, []);

  // ── Value ───────────────────────────────────────────────────────────────
  const value = {
    user,
    connections,
    connectionsLoading,
    refreshConnections,
    meetings,
    meetingsLoading,
    refreshMeetings,
    login,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * useApp() — convenience hook to consume the context.
 * Throws if used outside <AppProvider>.
 */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export default AppContext;

