'use client';

import { OUTBOX_MAX_ATTEMPTS, type OutboxEntry, type OutboxStatus } from '@muhami/shared';
import { ApiError, apiFetch } from '@/lib/api-client';
import { idbClear, idbDelete, idbGetAll, idbPut } from '@/lib/idb';

/**
 * The write outbox.
 *
 * ## What it is for
 *
 * A lawyer in a courthouse corridor has no signal. Recording the outcome of a
 * session there and losing it on the walk back to the car is the failure this
 * exists to prevent. A mutation that fails because the network is unreachable
 * is queued in IndexedDB and replayed when the connection returns.
 *
 * ## What it deliberately does not queue
 *
 * Only writes the caller explicitly marks queueable. Blanket queueing would be
 * wrong in both directions: a login cannot be replayed, and a
 * money-moving write must not be queued unless the server can prove the replay
 * is safe. Every queued entry carries an `Idempotency-Key` generated at queue
 * time, and the API records the response against it (Phase 15), so a replay
 * after a timeout returns the original result rather than performing the write
 * a second time.
 *
 * ## Why an entry can be parked
 *
 * A replay can fail for a reason no retry will fix — the record was changed by
 * someone else (409), the case was deleted (404), the user lost the permission
 * (403). Those become `CONFLICT` or `FAILED` and stop, with an Arabic
 * explanation, on a screen the user can act on. A queue that retries forever is
 * a queue nobody knows is broken.
 */

type Listener = (entries: OutboxEntry[]) => void;

/** The principal is not a credential; it binds a saved write to its author. */
export interface OutboxSession {
  readonly principal: string;
  readonly generation: number;
}

type StoredOutboxEntry = OutboxEntry & { principal: string };

const listeners = new Set<Listener>();
let cache: StoredOutboxEntry[] = [];
let principal: string | null = null;
let generation = 0;
let loaded = false;
let loading: Promise<OutboxEntry[]> | null = null;
let flushingGeneration: number | null = null;
let storageWork: Promise<void> = Promise.resolve();
let flushController: AbortController | null = null;

// Keep old writes, a purge and new writes in commit order. Otherwise a delayed
// IndexedDB put from account A could complete after account B cleared storage.
function withStorage<T>(work: () => Promise<T>): Promise<T> {
  const result = storageWork.then(work);
  storageWork = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function emit(): void {
  for (const listener of listeners) listener(cache);
}

/** Called only with a principal verified by login or GET /auth/me. */
export async function setOutboxIdentity(
  identity: { id: string; officeId: string } | null,
  purge = false,
): Promise<void> {
  const next = identity ? `${identity.officeId}:${identity.id}` : null;
  if (next === principal && !purge) return storageWork;

  const previous = principal;
  principal = next;
  generation += 1;
  cache = [];
  loaded = false;
  loading = null;
  flushController?.abort();
  emit();

  // On an initial authenticated load, retain only that user's scoped entries
  // (loadOutbox filters them). Known transitions and logout delete everything.
  if (purge || previous !== null || next === null) await withStorage(idbClear);
}

export function getOutboxSession(): OutboxSession {
  if (!principal) throw sessionChangedError();
  return { principal, generation };
}

function isCurrent(session: OutboxSession): boolean {
  return session.principal === principal && session.generation === generation;
}

export function assertOutboxSession(session: OutboxSession): void {
  if (!isCurrent(session)) throw sessionChangedError();
}

function sessionChangedError(): ApiError {
  return new ApiError({
    type: 'about:blank',
    title: 'SessionChanged',
    status: 403,
    code: 'FORBIDDEN',
    messageAr: 'The account changed. Open the record from your current account and try again.',
  });
}

export function subscribeToOutbox(listener: Listener): () => void {
  listeners.add(listener);
  listener(cache);
  return () => listeners.delete(listener);
}

export async function loadOutbox(): Promise<OutboxEntry[]> {
  // Never publish local confidential payloads before auth resolves.
  if (!principal) return [];
  if (loaded) return cache;
  if (loading) return loading;
  const session = getOutboxSession();
  const pending = withStorage(async () => {
    const stored = await idbGetAll<StoredOutboxEntry>();
    if (!isCurrent(session)) return [];

    const owned = stored.filter((entry) => entry.principal === session.principal);
    // Legacy unscoped entries cannot safely be attributed to a user.
    for (const entry of stored) {
      if (entry.principal !== session.principal) await idbDelete(entry.id);
    }
    const restored = owned.map((entry) =>
      entry.status === 'SENDING' ? { ...entry, status: 'PENDING' as const } : entry,
    );
    for (let index = 0; index < restored.length; index += 1) {
      if (!isCurrent(session)) return [];
      if (restored[index] !== owned[index]) await idbPut(restored[index]);
    }
    if (!isCurrent(session)) return [];
    cache = restored;
    loaded = true;
    emit();
    return cache;
  });
  loading = pending;
  try {
    return await pending;
  } finally {
    if (loading === pending) loading = null;
  }
}

export function getOutbox(): OutboxEntry[] {
  return cache;
}

/** Anything still expected to land. Drives the pending-changes badge. */
export function pendingCount(): number {
  return cache.filter((entry) => entry.status === 'PENDING' || entry.status === 'SENDING').length;
}

export function blockedCount(): number {
  return cache.filter((entry) => entry.status === 'FAILED' || entry.status === 'CONFLICT').length;
}

async function persist(entry: StoredOutboxEntry, session: OutboxSession): Promise<void> {
  await withStorage(async () => {
    assertOutboxSession(session);
    await idbPut(entry);
    assertOutboxSession(session);
    const index = cache.findIndex((candidate) => candidate.id === entry.id);
    if (index === -1) cache = [...cache, entry];
    else cache = cache.map((candidate) => (candidate.id === entry.id ? entry : candidate));
    emit();
  });
}

async function forget(id: string, session: OutboxSession): Promise<void> {
  await withStorage(async () => {
    assertOutboxSession(session);
    await idbDelete(id);
    assertOutboxSession(session);
    cache = cache.filter((entry) => entry.id !== id);
    emit();
  });
}

export async function enqueue(input: {
  method: OutboxEntry['method'];
  path: string;
  body?: unknown;
  labelAr: string;
  invalidate?: string[][];
  /** Reuse the key of an initial request whose response may have been lost. */
  idempotencyKey?: string;
  /** Captured before the initial network attempt, not after its failure. */
  session?: OutboxSession;
}): Promise<OutboxEntry> {
  const session = input.session ?? getOutboxSession();
  assertOutboxSession(session);
  await loadOutbox();
  assertOutboxSession(session);

  const entry: StoredOutboxEntry = {
    id: crypto.randomUUID(),
    principal: session.principal,
    method: input.method,
    path: input.path,
    body: input.body ?? null,
    idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    labelAr: input.labelAr,
    invalidate: input.invalidate ?? [],
    status: 'PENDING',
    attempts: 0,
    lastErrorAr: null,
    queuedAt: Date.now(),
  };

  await persist(entry, session);
  return entry;
}

/** Discard a parked entry belonging to the current user. */
export async function discard(id: string): Promise<void> {
  await forget(id, getOutboxSession());
}

/** Move a parked entry back to PENDING so the next flush picks it up. */
export async function retry(id: string): Promise<void> {
  const session = getOutboxSession();
  const entry = cache.find((candidate) => candidate.id === id);
  if (!entry) return;
  await persist({ ...entry, status: 'PENDING', attempts: 0, lastErrorAr: null }, session);
  void flushOutbox();
}

/** Replay in order, using the original key and verified account identity. */
export async function flushOutbox(): Promise<{ sent: number; blocked: number }> {
  if (!principal || flushingGeneration === generation) return { sent: 0, blocked: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, blocked: 0 };
  }

  const session = getOutboxSession();
  const controller = new AbortController();
  flushController = controller;
  flushingGeneration = session.generation;
  let sent = 0;
  let blocked = 0;

  try {
    await loadOutbox();
    if (!isCurrent(session)) return { sent, blocked };
    const queue = [...cache]
      .filter((entry) => entry.status === 'PENDING')
      .sort((a, b) => a.queuedAt - b.queuedAt);

    for (const entry of queue) {
      if (!isCurrent(session)) break;
      await persist({ ...entry, status: 'SENDING' }, session);
      if (!isCurrent(session)) break;
      try {
        await apiFetch(entry.path, {
          method: entry.method,
          ...(entry.body !== null ? { body: entry.body } : {}),
          idempotencyKey: entry.idempotencyKey,
          headers: { 'X-Outbox-Principal': session.principal },
          signal: controller.signal,
        });
        if (!isCurrent(session)) break;
        await forget(entry.id, session);
        sent += 1;
      } catch (error) {
        if (!isCurrent(session)) break;
        const outcome = classifyOutboxFailure(error, entry);
        if (outcome.status === 'PENDING') {
          await persist({ ...entry, status: 'PENDING' }, session);
          break;
        }
        blocked += 1;
        await persist(
          {
            ...entry,
            status: outcome.status,
            attempts: entry.attempts + 1,
            lastErrorAr: outcome.messageAr,
          },
          session,
        );
      }
    }
  } catch (error) {
    if (isCurrent(session)) throw error;
  } finally {
    if (flushingGeneration === session.generation) flushingGeneration = null;
    if (flushController === controller) flushController = null;
  }
  return { sent, blocked };
}

/**
 * Decide what a failure means for an entry.
 *
 * The distinction that matters is "the request never arrived" versus "the
 * server answered and said no". Only the first is worth retrying.
 */
export function classifyOutboxFailure(
  error: unknown,
  entry: OutboxEntry,
): { status: OutboxStatus; messageAr: string } {
  if (!(error instanceof ApiError)) {
    return { status: 'FAILED', messageAr: 'Unexpected error while sending.' };
  }

  // status 0 is the client's own NetworkError: nothing reached the server.
  if (error.status === 0) {
    return entry.attempts + 1 >= OUTBOX_MAX_ATTEMPTS
      ? { status: 'FAILED', messageAr: 'Could not connect after several attempts.' }
      : { status: 'PENDING', messageAr: '' };
  }

  if (error.status === 409 || error.code === 'VERSION_CONFLICT') {
    return {
      status: 'CONFLICT',
      messageAr: 'This record changed on another device after you recorded your edit.',
    };
  }

  // A 5xx might pass on a retry; a 4xx is the server's considered answer.
  if (error.status >= 500) {
    return entry.attempts + 1 >= OUTBOX_MAX_ATTEMPTS
      ? { status: 'FAILED', messageAr: error.messageAr }
      : { status: 'PENDING', messageAr: '' };
  }

  return { status: 'FAILED', messageAr: error.messageAr };
}

/**
 * Start replaying on reconnect.
 *
 * `online` is necessary but not sufficient — a phone reports online the moment
 * it associates with a captive portal — so a flush is also attempted when the
 * tab becomes visible, which is when a user has walked back into coverage and
 * opened the app.
 */
export function startOutboxSync(onFlushed?: (result: { sent: number }) => void): () => void {
  const flush = () => {
    void flushOutbox().then((result) => {
      if (result.sent > 0) onFlushed?.(result);
    });
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') flush();
  };

  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', onVisible);
  flush();

  return () => {
    window.removeEventListener('online', flush);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
