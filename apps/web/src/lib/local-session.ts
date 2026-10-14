'use client';

import {
  advanceApiSession,
  ApiError,
  api,
  setVerifiedApiPrincipal,
  settleAuthRefresh,
} from '@/lib/api-client';
import { setOutboxIdentity } from '@/lib/outbox';
import type { QueryClient } from '@tanstack/react-query';

export const LOCAL_PRINCIPAL_KEY = 'muhami-local-principal';
export const RECENT_SEARCHES_KEY = 'muhami-recent-searches';
export const RECENT_SEARCHES_CLEARED = 'muhami-recent-searches-cleared';
const SIGNED_OUT_KEY = 'muhami-signed-out';
let currentPrincipal: string | null | undefined;
let revision = 0;
let signedOutInMemory = false;
let pendingLogout: Promise<void> | null = null;

/** Profile and device/session queries are confidential too. Keep only /me. */
export async function clearPrivateQueries(queryClient: QueryClient): Promise<void> {
  const predicate = (query: { queryKey: readonly unknown[] }) =>
    !(query.queryKey.length === 2 && query.queryKey[0] === 'auth' && query.queryKey[1] === 'me');
  await queryClient.cancelQueries({ predicate });
  queryClient.removeQueries({ predicate });
}

export function localIdentityRevision(): number {
  return revision;
}

export function assertLocalIdentityRevision(expected: number): void {
  if (expected === revision) return;
  throw new ApiError({
    type: 'about:blank',
    title: 'SessionChanged',
    status: 403,
    code: 'FORBIDDEN',
    messageAr: 'The account changed. Refresh to continue with your current account.',
  });
}

export function hasPendingLocalLogout(): boolean {
  try {
    return localStorage.getItem(SIGNED_OUT_KEY) === '1';
  } catch {
    return signedOutInMemory;
  }
}

export function beginLocalLogout(): void {
  signedOutInMemory = true;
  try {
    localStorage.setItem(SIGNED_OUT_KEY, '1');
  } catch {
    // Remain signed out for this tab when persistent storage is unavailable.
  }
}

function finishLocalLogout(): void {
  signedOutInMemory = false;
  try {
    localStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    // A persistent marker that cannot be removed safely keeps auto-login off.
  }
}

/** Before restoring cookies or replacing them, finish a previous offline logout. */
export async function completePendingLocalLogout(): Promise<void> {
  if (!hasPendingLocalLogout()) return;
  pendingLogout ??= (async () => {
    await settleAuthRefresh();
    await api.post<void>('/auth/logout', undefined, {
      skipAuthRetry: true,
      beforeSend: () => {
        if (!hasPendingLocalLogout())
          throw new ApiError({
            type: 'about:blank',
            title: 'SessionChanged',
            status: 403,
            code: 'FORBIDDEN',
            messageAr: 'The account changed. Refresh to continue with your current account.',
          });
      },
    });
    finishLocalLogout();
  })().finally(() => {
    pendingLogout = null;
  });
  return pendingLogout;
}

function storedPrincipal(): string | null {
  try {
    return localStorage.getItem(LOCAL_PRINCIPAL_KEY);
  } catch {
    return null;
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Storage can be disabled. The in-memory history still clears.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(RECENT_SEARCHES_CLEARED));
}

/** Delete legacy private reads even before the new worker has activated. */
export async function purgePrivateReadCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(
          (name) =>
            name.startsWith('muhami-api-') ||
            (name.startsWith('muhami-shell-') && name !== 'muhami-shell-v6'),
        )
        .map((name) => caches.delete(name)),
    );
  } catch {
    // The worker also purges old caches on activation and never reads them.
  }
}

/** Complete local isolation before exposing a newly verified principal. */
export async function synchronizeLocalIdentity(
  identity: { id: string; officeId: string } | null,
  forcePurge = false,
): Promise<boolean> {
  const next = identity ? `${identity.officeId}:${identity.id}` : null;
  const previous = storedPrincipal();
  const initialized = currentPrincipal !== undefined;
  const changed = currentPrincipal !== next;
  const storageChanged = previous !== (next ?? '');
  setVerifiedApiPrincipal(next);
  if (changed || forcePurge) {
    advanceApiSession();
    revision += 1;
  }
  const expectedRevision = revision;
  currentPrincipal = next;
  if ((initialized && changed) || storageChanged || forcePurge) clearRecentSearches();
  // The storage event promptly invalidates other tabs sharing these cookies.
  try {
    localStorage.setItem(LOCAL_PRINCIPAL_KEY, next ?? '');
  } catch {
    // Server validation of X-Outbox-Principal remains the replay boundary.
  }
  await Promise.all([
    setOutboxIdentity(identity, forcePurge || (previous !== null && storageChanged)),
    purgePrivateReadCaches(),
  ]);
  assertLocalIdentityRevision(expectedRevision);
  return changed || storageChanged || forcePurge;
}

/** A different tab changed credentials; hide old data before checking /auth/me. */
export async function invalidateLocalIdentity(): Promise<void> {
  setVerifiedApiPrincipal(null);
  advanceApiSession();
  revision += 1;
  currentPrincipal = undefined;
  clearRecentSearches();
  await Promise.all([setOutboxIdentity(null, true), purgePrivateReadCaches()]);
}
