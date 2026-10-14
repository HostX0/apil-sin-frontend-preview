import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutboxEntry } from '@muhami/shared';
import type * as ApiClientModule from '@/lib/api-client';

const mocks = vi.hoisted(() => ({
  idbGetAll: vi.fn(),
  idbPut: vi.fn(),
  idbDelete: vi.fn(),
  idbClear: vi.fn(),
  apiFetch: vi.fn(),
}));

vi.mock('@/lib/idb', () => ({
  idbGetAll: mocks.idbGetAll,
  idbPut: mocks.idbPut,
  idbDelete: mocks.idbDelete,
  idbClear: mocks.idbClear,
}));
vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClientModule>()),
  apiFetch: mocks.apiFetch,
}));

type StoredEntry = OutboxEntry & { principal?: string };
const identity = { id: 'user-a', officeId: 'office-a' };
const principal = 'office-a:user-a';
const durable = new Map<string, StoredEntry>();
const interrupted: StoredEntry = {
  principal,
  id: 'saved-entry',
  method: 'POST',
  path: '/hearings/session/outcome',
  body: { outcome: 'ADJOURNED', notes: 'بانتظار مستند المحكمة' },
  idempotencyKey: 'original-request-key',
  labelAr: 'تثبيت قرار جلسة',
  invalidate: [['calendar']],
  status: 'SENDING',
  attempts: 1,
  lastErrorAr: null,
  queuedAt: 100,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  durable.clear();
  // Clone every storage boundary, as IndexedDB does: mutating the in-memory
  // result after idbPut must not change what a fresh application load reads.
  mocks.idbGetAll.mockImplementation(async () => structuredClone([...durable.values()]));
  mocks.idbPut.mockImplementation(async (entry: OutboxEntry) => {
    durable.set(entry.id, structuredClone(entry));
  });
  mocks.idbDelete.mockImplementation(async (id: string) => {
    durable.delete(id);
  });
  mocks.idbClear.mockImplementation(async () => durable.clear());
  mocks.apiFetch.mockResolvedValue({ id: 'saved-result' });
});

describe('outbox recovery after an application reload', () => {
  it('persists interrupted sends as pending before publishing them, then replays the same request', async () => {
    durable.set(interrupted.id, structuredClone(interrupted));
    const persisted = deferred<void>();
    mocks.idbPut.mockImplementationOnce(async (entry: OutboxEntry) => {
      await persisted.promise;
      durable.set(entry.id, structuredClone(entry));
    });
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    const listener = vi.fn();
    const unsubscribe = outbox.subscribeToOutbox(listener);
    listener.mockClear();

    const loading = outbox.loadOutbox();
    await vi.waitFor(() => expect(mocks.idbPut).toHaveBeenCalledOnce());
    expect(listener).not.toHaveBeenCalled();
    expect(outbox.getOutbox()).toEqual([]);
    expect(durable.get(interrupted.id)?.status).toBe('SENDING');

    persisted.resolve();
    const restored = await loading;
    expect(restored).toEqual([{ ...interrupted, status: 'PENDING' }]);
    expect(durable.get(interrupted.id)).toEqual(restored[0]);
    expect(listener).toHaveBeenCalledWith(restored);

    expect(await outbox.flushOutbox()).toEqual({ sent: 1, blocked: 0 });
    expect(mocks.apiFetch).toHaveBeenCalledWith(interrupted.path, {
      method: interrupted.method,
      body: interrupted.body,
      idempotencyKey: interrupted.idempotencyKey,
      headers: { 'X-Outbox-Principal': principal },
      signal: expect.any(AbortSignal),
    });
    expect(durable.size).toBe(0);
    unsubscribe();
  });

  it('shares the initial load and does not reset a currently sending request on another load', async () => {
    durable.set(interrupted.id, structuredClone(interrupted));
    const read = deferred<OutboxEntry[]>();
    mocks.idbGetAll.mockReturnValueOnce(read.promise);
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    const first = outbox.loadOutbox();
    const second = outbox.loadOutbox();
    await vi.waitFor(() => expect(mocks.idbGetAll).toHaveBeenCalledOnce());
    read.resolve(structuredClone([...durable.values()]));
    expect(await first).toBe(await second);
    expect(mocks.idbPut).toHaveBeenCalledOnce();

    const response = deferred<object>();
    mocks.apiFetch.mockReturnValueOnce(response.promise);
    const flushing = outbox.flushOutbox();
    await vi.waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledOnce());
    expect((await outbox.loadOutbox())[0]?.status).toBe('SENDING');
    expect(mocks.idbGetAll).toHaveBeenCalledOnce();
    expect(durable.get(interrupted.id)?.status).toBe('SENDING');
    response.resolve({ id: 'saved-result' });
    expect(await flushing).toEqual({ sent: 1, blocked: 0 });
  });

  it('can retry initial loading after a storage failure', async () => {
    durable.set(interrupted.id, structuredClone(interrupted));
    mocks.idbGetAll.mockRejectedValueOnce(new Error('storage unavailable'));
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    await expect(outbox.loadOutbox()).rejects.toThrow('storage unavailable');
    expect(await outbox.loadOutbox()).toEqual([{ ...interrupted, status: 'PENDING' }]);
    expect(mocks.idbGetAll).toHaveBeenCalledTimes(2);
  });

  it('keeps the original attempted key across queue persistence and a fresh module load', async () => {
    const { ApiError } = await import('@/lib/api-client');
    mocks.apiFetch.mockRejectedValueOnce(
      new ApiError({
        type: 'about:blank',
        title: 'NetworkError',
        status: 0,
        code: 'SERVICE_UNAVAILABLE',
        messageAr: 'تعذّر الاتصال بالخادم.',
      }),
    );
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    const { sendOrQueue } = await import('@/lib/offline');
    const body = { body: 'مراجعة المستند', requestId: 'stable-whatsapp-request' };
    const result = await sendOrQueue({
      method: 'POST',
      path: '/whatsapp/messages',
      body,
      labelAr: 'رسالة واتساب',
    });
    expect(result.queued).toBe(true);
    const originalKey = mocks.apiFetch.mock.calls[0]![1].idempotencyKey;
    expect([...durable.values()][0]?.idempotencyKey).toBe(originalKey);

    vi.resetModules();
    const freshOutbox = await import('@/lib/outbox');
    await freshOutbox.setOutboxIdentity(identity);
    const [restored] = await freshOutbox.loadOutbox();
    expect(restored?.idempotencyKey).toBe(originalKey);
    expect(restored?.body).toEqual(body);
    expect(await freshOutbox.flushOutbox()).toEqual({ sent: 1, blocked: 0 });
    expect(mocks.apiFetch.mock.calls[1]![1]).toEqual({
      method: 'POST',
      body,
      idempotencyKey: originalKey,
      headers: { 'X-Outbox-Principal': principal },
      signal: expect.any(AbortSignal),
    });
  });
});

describe('shared-device offline isolation', () => {
  it('does not expose or replay entries until the principal is verified', async () => {
    durable.set(interrupted.id, structuredClone(interrupted));
    const outbox = await import('@/lib/outbox');
    expect(await outbox.loadOutbox()).toEqual([]);
    expect(await outbox.flushOutbox()).toEqual({ sent: 0, blocked: 0 });
    expect(mocks.idbGetAll).not.toHaveBeenCalled();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it('discards legacy and foreign entries while retaining current-account retries', async () => {
    durable.set('legacy', { ...interrupted, id: 'legacy', principal: undefined });
    durable.set('foreign-user', {
      ...interrupted,
      id: 'foreign-user',
      principal: 'office-a:user-b',
    });
    durable.set('foreign-office', {
      ...interrupted,
      id: 'foreign-office',
      principal: 'office-b:user-a',
    });
    durable.set(interrupted.id, structuredClone(interrupted));
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    expect(await outbox.loadOutbox()).toEqual([{ ...interrupted, status: 'PENDING' }]);
    expect([...durable.keys()]).toEqual([interrupted.id]);
    await outbox.flushOutbox();
    expect(mocks.apiFetch).toHaveBeenCalledOnce();
    expect(mocks.apiFetch.mock.calls[0]![1].headers).toEqual({ 'X-Outbox-Principal': principal });
  });

  it('cannot publish a delayed account A load after switching to account B', async () => {
    durable.set(interrupted.id, structuredClone(interrupted));
    const read = deferred<StoredEntry[]>();
    mocks.idbGetAll.mockReturnValueOnce(read.promise);
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    const loading = outbox.loadOutbox();
    await vi.waitFor(() => expect(mocks.idbGetAll).toHaveBeenCalledOnce());
    const switching = outbox.setOutboxIdentity({ id: 'user-b', officeId: 'office-b' });
    expect(outbox.getOutbox()).toEqual([]);
    read.resolve([structuredClone(interrupted)]);
    expect(await loading).toEqual([]);
    await switching;
    expect(durable.size).toBe(0);
    expect(await outbox.loadOutbox()).toEqual([]);
    expect(mocks.idbPut).not.toHaveBeenCalled();
  });

  it('commits logout purge after an already-started put and never restores its payload', async () => {
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    const commit = deferred<void>();
    mocks.idbPut.mockImplementationOnce(async (entry: StoredEntry) => {
      await commit.promise;
      durable.set(entry.id, structuredClone(entry));
    });
    const queued = outbox.enqueue({
      method: 'POST',
      path: '/whatsapp/messages',
      body: { body: 'private A' },
      labelAr: 'رسالة',
    });
    const rejected = expect(queued).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await vi.waitFor(() => expect(mocks.idbPut).toHaveBeenCalledOnce());
    const logout = outbox.setOutboxIdentity(null, true);
    expect(outbox.getOutbox()).toEqual([]);
    expect(mocks.idbClear).not.toHaveBeenCalled();
    commit.resolve();
    await rejected;
    await logout;
    expect(durable.size).toBe(0);
    expect(outbox.getOutbox()).toEqual([]);
  });

  it('stops a captured queue and a late failure after account change', async () => {
    durable.set(interrupted.id, { ...interrupted, status: 'PENDING' });
    durable.set('second', { ...interrupted, id: 'second', status: 'PENDING', queuedAt: 200 });
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    const response = deferred<unknown>();
    mocks.apiFetch.mockReturnValueOnce(response.promise);
    const flushing = outbox.flushOutbox();
    await vi.waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledOnce());
    const signal = mocks.apiFetch.mock.calls[0]![1].signal;
    await outbox.setOutboxIdentity({ id: 'user-b', officeId: 'office-a' });
    expect(signal.aborted).toBe(true);
    response.resolve(Promise.reject(new Error('late network failure')));
    expect(await flushing).toEqual({ sent: 0, blocked: 0 });
    expect(mocks.apiFetch).toHaveBeenCalledOnce();
    expect(durable.size).toBe(0);
    expect(outbox.getOutbox()).toEqual([]);
  });

  it('does not enqueue an initial request failure under a newly logged-in user', async () => {
    const outbox = await import('@/lib/outbox');
    await outbox.setOutboxIdentity(identity);
    const response = deferred<unknown>();
    mocks.apiFetch.mockReturnValueOnce(response.promise);
    const { sendOrQueue } = await import('@/lib/offline');
    const { ApiError } = await import('@/lib/api-client');
    const attempted = sendOrQueue({
      method: 'POST',
      path: '/whatsapp/messages',
      body: { body: 'private A' },
      labelAr: 'رسالة',
    });
    const rejected = expect(attempted).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.apiFetch.mock.calls[0]![1].headers).toEqual({ 'X-Outbox-Principal': principal });
    await outbox.setOutboxIdentity({ id: 'user-b', officeId: 'office-b' });
    response.resolve(
      Promise.reject(
        new ApiError({
          type: 'about:blank',
          title: 'Offline',
          status: 0,
          code: 'SERVICE_UNAVAILABLE',
          messageAr: 'لا يوجد اتصال',
        }),
      ),
    );
    await rejected;
    expect(durable.size).toBe(0);
    expect(outbox.getOutbox()).toEqual([]);
    expect(mocks.idbPut).not.toHaveBeenCalled();
  });
});
