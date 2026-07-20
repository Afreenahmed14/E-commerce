import { createContext, useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { setAccessToken, getAccessToken } from '../services/api';

export const AuthContext = createContext(null);

const REGISTER_FN = {
  candidate: authService.registerCandidate,
  company: authService.registerCompany,
};

const LOGIN_FN = {
  candidate: authService.loginCandidate,
  company: authService.loginCompany,
  admin: authService.loginAdmin,
};

const FIREBASE_LOGIN_FN = {
  candidate: authService.firebaseCandidate,
  company: authService.firebaseCompany,
  admin: authService.firebaseAdmin,
};

/**
 * Provides authentication state (current user, role, loading) and
 * register/login/logout actions to the whole app. On mount, if an access
 * token is already cached, it verifies the session via GET /auth/me so a
 * page refresh doesn't lose the logged-in state.
 *
 * `register`/`login` both take a `role` so they can call the correct
 * role-specific backend endpoint (candidates, companies, and admins are
 * separate collections with separate auth routes).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    try {
      const res = await authService.getMe();
      setUser(res.data.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener('auth:sessionExpired', handleExpired);
    return () => window.removeEventListener('auth:sessionExpired', handleExpired);
  }, []);

  const register = async (role, payload) => {
    const res = await REGISTER_FN[role](payload);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const login = async (role, payload) => {
    const res = await LOGIN_FN[role](payload);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  // idToken comes from firebaseAuthService (Google popup / Phone OTP /
  // Email magic-link — see FirebaseAuthButtons.jsx). `extra` is only used
  // the first time a given person signs in (account creation): candidates
  // need `hourlyRate`, companies need `companyName`. Admin never creates.
  const loginWithFirebase = async (role, idToken, extra = {}) => {
    const res = await FIREBASE_LOGIN_FN[role](idToken, extra);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    register,
    login,
    loginWithFirebase,
    logout,
    refreshUser: loadCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
