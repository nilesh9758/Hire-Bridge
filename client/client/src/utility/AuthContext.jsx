import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);

export const HOME_BY_ROLE = { student: '/student', company: '/company', admin: '/admin' };
export const ROLE_LABELS = { student: 'Student', company: 'Recruiter', admin: 'Admin' };

// A path is only reachable by the role whose area it belongs to
export const isPathAllowedForRole = (path, role) => {
  const home = HOME_BY_ROLE[role];
  return Boolean(home && path && (path === home || path.startsWith(`${home}/`)));
};

// localStorage is used only as a cross-tab "the session changed" signal.
// It never holds user data and is never trusted for access decisions:
// the server (GET /auth/me, backed by httpOnly cookies) is the single source of truth.
const SESSION_SIGNAL_KEY = 'hirebridge-session-signal';
const ACCOUNT_BLOCK_CODES = ['ACCOUNT_DISABLED', 'ACCOUNT_PENDING'];
const REFRESH_ENDPOINTS = { student: '/student/refresh-token', company: '/company/refresh-token' };

const signalOtherTabs = () => {
  try {
    localStorage.setItem(SESSION_SIGNAL_KEY, String(Date.now()));
  } catch {
    // storage unavailable (private mode); tabs will still re-check on focus
  }
};

const goToLogin = (params) => {
  const from = window.location.pathname + window.location.search;
  const search = new URLSearchParams({ ...params, from });
  window.location.replace(`/login?${search.toString()}`);
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState({ status: 'loading', user: null, role: null });
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const applySession = useCallback((user, role) => {
    setSession(user ? { status: 'authenticated', user, role } : { status: 'anonymous', user: null, role: null });
  }, []);

  // Ask the server who is logged in (the cookie is shared by every tab)
  const verify = useCallback(async () => {
    try {
      const res = await api.get('/auth/me', { skipAuthRedirect: true });
      const { user, role } = res.data.data;
      const previous = sessionRef.current;
      const changed = previous.status === 'authenticated' && (previous.role !== role || previous.user?._id !== user._id);
      if (changed) {
        // Another tab signed in as someone else: never keep showing the previous
        // user's data. Reload so every page refetches as the current user
        // (the route guard then decides whether this URL is still allowed).
        window.location.reload();
      }
      applySession(user, role);
      return { user, role, changed };
    } catch {
      applySession(null, null);
      return { user: null, role: null };
    }
  }, [applySession]);

  useEffect(() => { verify(); }, [verify]);

  // Keep every tab in sync: another tab logging in/out rewrites the shared cookie
  useEffect(() => {
    let lastCheck = 0;
    const recheck = () => {
      if (Date.now() - lastCheck < 3000) return;
      lastCheck = Date.now();
      verify();
    };
    const onStorage = (e) => { if (e.key === SESSION_SIGNAL_KEY) verify(); };
    const onVisible = () => { if (document.visibilityState === 'visible') recheck(); };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(recheck, 60000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [verify]);

  // Central handling of auth failures from any API call
  useEffect(() => {
    const id = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { response, config = {} } = error;
        const isAuthCall = config.url?.startsWith('/auth/');

        // Account disabled / not approved while logged in: sign out and explain
        const code = response?.data?.data?.code;
        if (response?.status === 403 && ACCOUNT_BLOCK_CODES.includes(code) && !isAuthCall) {
          applySession(null, null);
          signalOtherTabs();
          goToLogin({ blocked: code });
          return Promise.reject(error);
        }

        if (response?.status === 401 && !isAuthCall && !config.skipAuthRedirect) {
          // Try a silent token refresh once
          const refreshUrl = REFRESH_ENDPOINTS[sessionRef.current.role];
          if (refreshUrl && !config._retried) {
            try {
              await api.post(refreshUrl, {}, { skipAuthRedirect: true });
              return api({ ...config, _retried: true });
            } catch {
              // fall through
            }
          }
          // The cookie may now belong to another user (logged in from another tab)
          const { user, role } = await verify();
          if (!user) {
            goToLogin({ reason: 'expired' });
          } else if (!isPathAllowedForRole(window.location.pathname, role)) {
            goToLogin({ reason: 'denied' });
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, [applySession, verify]);

  // Returns { success, role } or { success: false, message, code, enableRequested }
  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, role } = res.data.data;
      applySession(user, role);
      signalOtherTabs();
      return { success: true, role };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.',
        code: error.response?.data?.data?.code,
        enableRequested: error.response?.data?.data?.enableRequested,
      };
    }
  }, [applySession]);

  const logout = useCallback(async ({ redirect = true } = {}) => {
    try {
      await api.post('/auth/logout');
    } catch {
      // cookies are cleared server-side even if the token was already invalid
    }
    applySession(null, null);
    signalOtherTabs();
    if (redirect) window.location.replace('/login?reason=loggedout');
  }, [applySession]);

  const refreshUser = useCallback(() => verify(), [verify]);

  return (
    <AuthContext.Provider value={{ ...session, loading: session.status === 'loading', login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
