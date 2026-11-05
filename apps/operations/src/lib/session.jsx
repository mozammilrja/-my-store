import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from './api';
import { usePortal } from '../portal/session';

/**
 * The signed-in admin, read from /admin/me and shared by the admin area.
 *
 * Signing in and out belongs to the operations portal (src/portal); this is
 * the admin account of that session. The API is the authority: /admin/settings
 * writes and every /admin/users write are refused for a non-owner server-side.
 * This context exists so the UI can say so before the request rather than
 * after a 403, and so the role check lives in one place.
 */
const SessionContext = createContext({
  isSignedIn: false,
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
  const portal = usePortal();
  const hasAdmin = portal.hasArea('admin');
  const sessionId = portal.principal?.session.id ?? null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'me', sessionId],
    queryFn: () => adminApi.me(),
    enabled: hasAdmin,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo(() => {
    const admin = hasAdmin ? data?.admin ?? null : null;
    const role = admin?.role ?? portal.principal?.accounts.admin?.role ?? null;
    const isOwner = role === 'owner';
    return {
      isSignedIn: hasAdmin,
      endedBy: portal.endedBy,
      signOut: portal.signOut,
      admin,
      role,
      isOwner,
      isLoading: hasAdmin && isLoading,
      isError,
      /** `can('users:write')` — unknown capabilities are allowed, owner-only ones are not. */
      can: (capability) => (OWNER_ONLY.has(capability) ? isOwner : Boolean(role)),
    };
  }, [hasAdmin, data, isLoading, isError, portal.principal, portal.endedBy, portal.signOut]);

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
