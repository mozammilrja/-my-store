import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, clearToken, getToken, onTokenChange, setToken } from './api';

/**
 * The signed-in admin, read once from /admin/me and shared by the whole app.
 *
 * The API is the authority: /admin/settings writes and every /admin/users
 * write are refused for a staff account server-side. This context exists so
 * the UI can say so before the request rather than after a 403, and so the
 * role check lives in one place instead of being retyped per component.
 */
const SessionContext = createContext({
  token: null,
  isSignedIn: false,
  signIn: async () => {},
  signOut: () => {},
  admin: null,
  role: null,
  isOwner: false,
  isLoading: true,
  can: () => false,
});

/** Capabilities the API enforces, named once here. */
const OWNER_ONLY = new Set(['users:write', 'settings:write']);

export function SessionProvider({ children }) {
  const queryClient = useQueryClient();
  // The stored token is the only proof of a session. It changes on sign-in,
  // sign-out, and when the API refuses it (api.js forgets it on a 401).
  const [token, setTokenState] = useState(() => getToken());
  // Why the last session ended: 'user' for Sign out, 'expired' when the API
  // refused the token. The login page words its notice from this.
  const [endedBy, setEndedBy] = useState(null);
  const signingOut = useRef(false);
  useEffect(
    () =>
      onTokenChange((next) => {
        setTokenState(next);
        if (next) setEndedBy(null);
        else setEndedBy(signingOut.current ? 'user' : 'expired');
        signingOut.current = false;
      }),
    []
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'me', token],
    queryFn: () => adminApi.me(),
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const signIn = useCallback(
    async (email, password) => {
      const { token: issued } = await adminApi.login(email, password);
      // Nothing cached under a previous admin may leak into this session.
      queryClient.clear();
      setToken(issued);
      return issued;
    },
    [queryClient]
  );

  const signOut = useCallback(() => {
    signingOut.current = true;
    clearToken();
  }, []);

  const value = useMemo(() => {
    const admin = token ? data?.admin ?? null : null;
    const role = admin?.role ?? null;
    const isOwner = role === 'owner';
    return {
      token,
      isSignedIn: Boolean(token),
      endedBy,
      signIn,
      signOut,
      admin,
      role,
      isOwner,
      isLoading: Boolean(token) && isLoading,
      isError,
      /** `can('users:write')` — unknown capabilities are allowed, owner-only ones are not. */
      can: (capability) => (OWNER_ONLY.has(capability) ? isOwner : Boolean(role)),
    };
  }, [token, endedBy, data, isLoading, isError, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

/**
 * Renders `children` only when the session carries the capability, and shows
 * the fallback otherwise. Hiding the control is the courtesy; the API refusing
 * the write is the control.
 */
export function RequireCapability({ capability, fallback = null, children }) {
  const { can } = useSession();
  return can(capability) ? children : fallback;
}
