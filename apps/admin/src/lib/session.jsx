import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from './api';

/**
 * The signed-in admin, read once from /admin/me and shared by the whole app.
 *
 * The API is the authority: /admin/settings writes and every /admin/users
 * write are refused for a staff account server-side. This context exists so
 * the UI can say so before the request rather than after a 403, and so the
 * role check lives in one place instead of being retyped per component.
 */
const SessionContext = createContext({
  admin: null,
  role: null,
  isOwner: false,
  isLoading: true,
  can: () => false,
});

/** Capabilities the API enforces, named once here. */
const OWNER_ONLY = new Set(['users:write', 'settings:write']);

export function SessionProvider({ children }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: () => adminApi.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo(() => {
    const admin = data?.admin ?? null;
    const role = admin?.role ?? null;
    const isOwner = role === 'owner';
    return {
      admin,
      role,
      isOwner,
      isLoading,
      isError,
      /** `can('users:write')` — unknown capabilities are allowed, owner-only ones are not. */
      can: (capability) => (OWNER_ONLY.has(capability) ? isOwner : Boolean(role)),
    };
  }, [data, isLoading, isError]);

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
