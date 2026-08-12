/**
 * core/providers/AuthContext.tsx
 *
 * Complete session lifecycle:
 *   Register → Login → Access Token (memory) → Refresh → Logout → Recovery
 *
 * Auth state has three explicit states:
 *   loading       → startup check in progress, render nothing (no redirect flicker)
 *   authenticated → user is signed in
 *   unauthenticated → user needs to sign in
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { client, tokenStore, ApiError } from '../api/client';
import { syncManager } from '../sync/syncManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  currency: string;
  theme: string;
  timezone: string;
  locale: string;
  superiorCategoriesEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  user: User | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
  });

  // Guard: only run startup once even in StrictMode double-mount
  const startupRan = useRef(false);

  // ─── Startup: attempt silent session recovery ──────────────────────────────
  useEffect(() => {
    if (startupRan.current) return;
    startupRan.current = true;

    async function initializeSession() {
      try {
        // If no access token in memory, try a silent refresh first
        if (!tokenStore.get()) {
          try {
            await client.refreshSession();
          } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 429)) {
              // No valid session cookie present or rate limited — user is cleanly unauthenticated
              setState({ status: 'unauthenticated', user: null });
              return;
            }
            throw err; // Network or server errors rethrown to outer catch
          }
        }

        // Now try to fetch the current user
        if (tokenStore.get()) {
          try {
            const { data } = await client.get<{ user: User }>('/auth/me');
            setState({ status: 'authenticated', user: data.user });
            return;
          } catch (err) {
            // Only clear token and drop to unauthenticated if it's a 401
            if (err instanceof ApiError && err.status === 401) {
              tokenStore.clear();
            } else {
              throw err; // rethrow network errors to be caught by outer catch
            }
          }
        }

        setState({ status: 'unauthenticated', user: null });
      } catch (err) {
        // Network errors or server failures rethrown here
        setState({ status: 'error', user: null });
      }
    }

    initializeSession();
  }, []);

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const { data } = await client.post<{ accessToken: string; user: User }>(
      '/auth/login',
      { email, password },
    );
    tokenStore.set(data.accessToken);
    setState({ status: 'authenticated', user: data.user });
  }, []);

  // ─── Register ──────────────────────────────────────────────────────────────
  // Automatically authenticates on success — no separate login step required.
  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    // 1. Register the account
    await client.post('/auth/register', { email, password, fullName });

    // 2. Immediately login to get tokens
    const { data } = await client.post<{ accessToken: string; user: User }>(
      '/auth/login',
      { email, password },
    );
    tokenStore.set(data.accessToken);
    setState({ status: 'authenticated', user: data.user });
  }, []);

  // ─── Logout ────────────────────────────────────────────────────────────────
  //
  // Coordinated logout sequence:
  //   1. Signal SyncEngine to abort any in-flight sync and stop future flushes.
  //      This prevents any queued mutation from User A being submitted after
  //      the token is cleared (critical for multi-user device safety).
  //      The queue itself is NOT cleared — unsynced financial data is preserved
  //      and will sync automatically when the same user authenticates again.
  //   2. Clear the in-memory access token immediately.
  //   3. Best-effort server logout (revoke refresh token cookie).
  //   4. Mark state as unauthenticated → triggers ProtectedRoute redirect.
  //
  const logout = useCallback(async () => {
    // Capture userId before clearing state.
    const currentUserId = state.user?.id ?? '';

    // Step 1: Abort in-flight sync, stop future flushes.
    await syncManager.prepareForLogout(currentUserId);

    // Step 2: Clear the access token so no further authenticated requests
    // can be made from this point forward.
    tokenStore.clear();

    // Step 3: Best-effort revocation of the refresh token cookie.
    // NetworkError or server errors are swallowed — the local session is
    // already cleared above, which is what matters for client security.
    try {
      await client.post('/auth/logout', {});
    } catch { /* best-effort — local session already cleared */ }

    // Step 4: Transition to unauthenticated — triggers ProtectedRoute redirect.
    setState({ status: 'unauthenticated', user: null });
  }, [state.user?.id]);

  const updateUser = useCallback(async (data: Partial<User>) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...data } : null,
    }));
    try {
      const res = await client.patch<{ user: User }>('/auth/me', data);
      setState((prev) => ({
        ...prev,
        user: res.data.user,
      }));
    } catch (err) {
      // Revert if API fails
      const meRes = await client.get<{ user: User }>('/auth/me');
      setState((prev) => ({
        ...prev,
        user: meRes.data.user,
      }));
      throw err;
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
