'use client';

import { useSyncExternalStore } from 'react';
import type { OutboxEntry } from '@muhami/shared';
import { ApiError, apiFetch } from '@/lib/api-client';
import {
  assertOutboxSession,
  enqueue,
  getOutbox,
  getOutboxSession,
  loadOutbox,
  subscribeToOutbox,
} from '@/lib/outbox';

/**
 * The bridge between a mutation and the outbox.
 *
 * ## The one subtlety worth reading
 *
 * The idempotency key is minted *before* the first attempt, not when the entry
 * is queued. A request that fails with a transport error may already have
 * reached the server and committed — the response was lost, not the effect.
 * Queuing it with a fresh key would replay it as a second, unrelated write. The
 * same key means the API recognises the replay and returns the original result.
 *
 * ## What "offline" means here
 *
 * Only a transport failure — `ApiError` with status 0, which the client raises
 * when `fetch` itself rejects. A 500 is the server answering, and answering
 * badly; queuing it would hide a real fault behind a spinner that eventually
 * says "sent".
 */
export type SendResult<T> = { queued: false; data: T } | { queued: true; entry: OutboxEntry };

export async function sendOrQueue<T>(options: {
  method: OutboxEntry['method'];
  path: string;
  body?: unknown;
  /** Shown on the pending-changes screen. Must name the record, not the endpoint. */
  labelAr: string;
  invalidate?: string[][];
}): Promise<SendResult<T>> {
  const session = getOutboxSession();
  const idempotencyKey = crypto.randomUUID();

  try {
    const data = await apiFetch<T>(options.path, {
      method: options.method,
      ...(options.body !== undefined ? { body: options.body } : {}),
      idempotencyKey,
      headers: { 'X-Outbox-Principal': session.principal },
    });
    assertOutboxSession(session);
    return { queued: false, data };
  } catch (error) {
    if (!isTransportFailure(error)) throw error;
    assertOutboxSession(session);

    const entry = await enqueue({
      method: options.method,
      path: options.path,
      body: options.body,
      labelAr: options.labelAr,
      idempotencyKey,
      session,
      ...(options.invalidate ? { invalidate: options.invalidate } : {}),
    });

    return { queued: true, entry };
  }
}

export function isTransportFailure(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

// ── React bindings ──────────────────────────────────────────────────────────

/**
 * Online status.
 *
 * `navigator.onLine` is famously optimistic — it reports true for a device
 * associated with a network that has no route to the internet. It is used here
 * only to decide when to *attempt* a flush; whether a request actually
 * succeeded is decided by the request, never by this flag.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,
    // Server render: assume online, so no offline banner flashes during hydration.
    () => true,
  );
}

export function useOutbox(): OutboxEntry[] {
  return useSyncExternalStore(
    (callback) => {
      void loadOutbox();
      return subscribeToOutbox(() => callback());
    },
    getOutbox,
    () => EMPTY,
  );
}

const EMPTY: OutboxEntry[] = [];
