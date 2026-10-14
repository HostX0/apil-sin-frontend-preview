'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { AuthenticatedUser, LoginInput, Permission } from '@muhami/shared';
import { ApiError, api, settleAuthRefresh } from '@/lib/api-client';
import {
  assertLocalIdentityRevision,
  beginLocalLogout,
  clearPrivateQueries,
  completePendingLocalLogout,
  hasPendingLocalLogout,
  invalidateLocalIdentity,
  LOCAL_PRINCIPAL_KEY,
  localIdentityRevision,
  synchronizeLocalIdentity,
} from '@/lib/local-session';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  /** Permission check used by every guarded control in the UI. */
  can: (permission: Permission) => boolean;
  canAny: (...permissions: Permission[]) => boolean;
  login: (input: LoginInput) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  /** Re-read the principal. Used after office registration signs the owner in. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const clearOfficeQueries = useCallback(() => clearPrivateQueries(queryClient), [queryClient]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async ({ signal }) => {
      if (hasPendingLocalLogout()) {
        // HttpOnly cookies may still exist after an offline logout. Never use
        // them to silently reopen confidential UI; retry revocation first.
        await synchronizeLocalIdentity(null, true);
        await clearOfficeQueries();
        try {
          await completePendingLocalLogout();
        } catch {
          // Keep the local signed-out marker until the server is reachable.
        }
        return null;
      }
      try {
        const startingRevision = localIdentityRevision();
        const principal = await api.get<AuthenticatedUser>('/auth/me', { signal });
        assertLocalIdentityRevision(startingRevision);
        const changed = await synchronizeLocalIdentity(principal);
        const revision = localIdentityRevision();
        if (changed) await clearOfficeQueries();
        assertLocalIdentityRevision(revision);
        return principal;
      } catch (error) {
        // Not being logged in is a normal state, not an error to surface.
        if (error instanceof ApiError && error.isAuthError) {
          await synchronizeLocalIdentity(null, true);
          await clearOfficeQueries();
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      await queryClient.cancelQueries({ queryKey: ['auth', 'me'] });
      await completePendingLocalLogout();
      await settleAuthRefresh();
      const localRevision = localIdentityRevision();
      const result = await api.post<{ user: AuthenticatedUser }>('/auth/login', input, {
        skipAuthRetry: true,
      });
      assertLocalIdentityRevision(localRevision);
      return { ...result, localRevision };
    },
    onSuccess: async (result) => {
      assertLocalIdentityRevision(result.localRevision);
      await synchronizeLocalIdentity(result.user);
      const revision = localIdentityRevision();
      await clearOfficeQueries();
      assertLocalIdentityRevision(revision);
      queryClient.setQueryData(['auth', 'me'], result.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Stop queue work immediately; only then revoke the last rotated cookie.
      beginLocalLogout();
      queryClient.setQueryData(['auth', 'me'], null);
      await synchronizeLocalIdentity(null, true);
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(['auth', 'me'], null);
      await completePendingLocalLogout();
    },
  });

  const logoutEverywhereMutation = useMutation({
    mutationFn: async () => {
      const principal = data ? `${data.officeId}:${data.id}` : null;
      await synchronizeLocalIdentity(null, true);
      await queryClient.cancelQueries();
      await settleAuthRefresh();
      return api.delete<void>('/auth/sessions', {
        skipAuthRetry: true,
        ...(principal ? { headers: { 'X-Outbox-Principal': principal } } : {}),
      });
    },
    // Unlike ordinary logout, a failure here must not look like all remote
    // devices were secured. Keep the current screen alive so the error is
    // visible and the user can retry.
    onSuccess: async () => {
      await synchronizeLocalIdentity(null, true);
      queryClient.clear();
      queryClient.setQueryData(['auth', 'me'], null);
    },
    onError: async () => {
      // Revocation failed: verify the still-active principal before resuming.
      await refetch();
    },
  });

  useEffect(() => {
    const changedInAnotherTab = (event: StorageEvent) => {
      if (event.key !== LOCAL_PRINCIPAL_KEY && event.key !== null) return;
      // Cookies are shared across tabs. Hide old cached UI synchronously.
      queryClient.setQueryData(['auth', 'me'], null);
      const clearing = invalidateLocalIdentity();
      void (async () => {
        await queryClient.cancelQueries();
        await clearing;
        await clearOfficeQueries();
        await refetch();
      })();
    };
    window.addEventListener('storage', changedInAnotherTab);
    const retryLogout = () => {
      if (hasPendingLocalLogout()) void completePendingLocalLogout().catch(() => undefined);
    };
    window.addEventListener('online', retryLogout);
    return () => {
      window.removeEventListener('storage', changedInAnotherTab);
      window.removeEventListener('online', retryLogout);
    };
  }, [queryClient, clearOfficeQueries, refetch]);

  const user = data ?? null;

  const can = useCallback(
    (permission: Permission) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const canAny = useCallback(
    (...permissions: Permission[]) => permissions.some((p) => user?.permissions.includes(p)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      can,
      canAny,
      login: async (input) => {
        const result = await loginMutation.mutateAsync(input);
        return result.user;
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      logoutEverywhere: async () => {
        await logoutEverywhereMutation.mutateAsync();
      },
      // Re-reads the principal after a flow that establishes a session outside
      // `login` — office registration, which signs the new owner straight in.
      refresh: async () => {
        await refetch();
      },
    }),
    [
      user,
      isLoading,
      can,
      canAny,
      loginMutation,
      logoutMutation,
      logoutEverywhereMutation,
      refetch,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/**
 * Renders children only when the permission is held.
 *
 * The API is the real authority; this exists so users are not shown buttons
 * that will refuse them — not as a security boundary.
 */
export function Can({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
}
