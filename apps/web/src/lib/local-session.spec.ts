import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiClientModule from '@/lib/api-client';

const mocks = vi.hoisted(() => ({
  setOutboxIdentity: vi.fn(),
  advanceApiSession: vi.fn(),
  logout: vi.fn(),
  settleAuthRefresh: vi.fn(),
}));
vi.mock('@/lib/outbox', () => ({ setOutboxIdentity: mocks.setOutboxIdentity }));
vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClientModule>()),
  advanceApiSession: mocks.advanceApiSession,
  api: { post: mocks.logout },
  settleAuthRefresh: mocks.settleAuthRefresh,
}));

const storage = new Map<string, string>();
const cacheNames = new Set<string>();
const browser = new EventTarget();
const a = { id: 'user-a', officeId: 'office-a' };
const b = { id: 'user-b', officeId: 'office-b' };

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  storage.clear();
  cacheNames.clear();
  mocks.setOutboxIdentity.mockResolvedValue(undefined);
  mocks.logout.mockResolvedValue(undefined);
  mocks.settleAuthRefresh.mockResolvedValue(undefined);
  vi.stubGlobal('window', browser);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal('caches', {
    keys: async () => [...cacheNames],
    delete: async (name: string) => cacheNames.delete(name),
  });
});

describe('local browser identity lifecycle', () => {
  it('removes legacy unowned search and private cached reads on initial verified login', async () => {
    const session = await import('@/lib/local-session');
    storage.set(session.RECENT_SEARCHES_KEY, '["private legacy name"]');
    for (const name of [
      'muhami-api-v5',
      'muhami-api-v6',
      'muhami-shell-v5',
      'muhami-shell-v6',
      'muhami-assets-v6',
      'other-app',
    ])
      cacheNames.add(name);
    const cleared = vi.fn();
    browser.addEventListener(session.RECENT_SEARCHES_CLEARED, cleared, { once: true });
    expect(await session.synchronizeLocalIdentity(a)).toBe(true);
    expect(storage.has(session.RECENT_SEARCHES_KEY)).toBe(false);
    expect(storage.get(session.LOCAL_PRINCIPAL_KEY)).toBe('office-a:user-a');
    expect(mocks.setOutboxIdentity).toHaveBeenCalledWith(a, false);
    expect(cleared).toHaveBeenCalledOnce();
    expect([...cacheNames]).toEqual(['muhami-shell-v6', 'muhami-assets-v6', 'other-app']);
  });

  it('retains only the same verified user history/queue across a reload', async () => {
    const session = await import('@/lib/local-session');
    storage.set(session.LOCAL_PRINCIPAL_KEY, 'office-a:user-a');
    storage.set(session.RECENT_SEARCHES_KEY, '["own search"]');
    await session.synchronizeLocalIdentity(a);
    expect(storage.get(session.RECENT_SEARCHES_KEY)).toBe('["own search"]');
    expect(mocks.setOutboxIdentity).toHaveBeenCalledWith(a, false);
    mocks.advanceApiSession.mockClear();
    expect(await session.synchronizeLocalIdentity(a)).toBe(false);
    expect(mocks.advanceApiSession).not.toHaveBeenCalled();
  });

  it('clears history and awaits the durable purge before completing an account transition', async () => {
    const session = await import('@/lib/local-session');
    await session.synchronizeLocalIdentity(a);
    storage.set(session.RECENT_SEARCHES_KEY, '["private A"]');
    let release!: () => void;
    mocks.setOutboxIdentity.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    let completed = false;
    const switched = session.synchronizeLocalIdentity(b).then(() => {
      completed = true;
    });
    expect(storage.has(session.RECENT_SEARCHES_KEY)).toBe(false);
    expect(storage.get(session.LOCAL_PRINCIPAL_KEY)).toBe('office-b:user-b');
    expect(mocks.setOutboxIdentity).toHaveBeenLastCalledWith(b, true);
    await Promise.resolve();
    expect(completed).toBe(false);
    release();
    await switched;
    expect(completed).toBe(true);
  });

  it('purges local writes/history for logout and invalidates another tab without broadcasting credentials', async () => {
    const session = await import('@/lib/local-session');
    await session.synchronizeLocalIdentity(a);
    storage.set(session.RECENT_SEARCHES_KEY, '["private A"]');
    await session.synchronizeLocalIdentity(null, true);
    expect(storage.get(session.LOCAL_PRINCIPAL_KEY)).toBe('');
    expect(storage.has(session.RECENT_SEARCHES_KEY)).toBe(false);
    expect(mocks.setOutboxIdentity).toHaveBeenLastCalledWith(null, true);
    storage.set(session.LOCAL_PRINCIPAL_KEY, 'office-b:user-b');
    await session.invalidateLocalIdentity();
    expect(storage.get(session.LOCAL_PRINCIPAL_KEY)).toBe('office-b:user-b');
    expect(mocks.setOutboxIdentity).toHaveBeenLastCalledWith(null, true);
  });
});

describe('offline logout remains closed across reloads', () => {
  it('keeps the signed-out marker after failed server revocation and clears it only after success', async () => {
    const session = await import('@/lib/local-session');
    await session.synchronizeLocalIdentity(a);
    session.beginLocalLogout();
    await session.synchronizeLocalIdentity(null, true);
    mocks.logout.mockRejectedValueOnce(new Error('offline'));
    await expect(session.completePendingLocalLogout()).rejects.toThrow('offline');
    expect(session.hasPendingLocalLogout()).toBe(true);
    vi.resetModules();
    const reloaded = await import('@/lib/local-session');
    expect(reloaded.hasPendingLocalLogout()).toBe(true);
    await reloaded.completePendingLocalLogout();
    expect(reloaded.hasPendingLocalLogout()).toBe(false);
    expect(mocks.logout).toHaveBeenLastCalledWith(
      '/auth/logout',
      undefined,
      expect.objectContaining({
        skipAuthRetry: true,
      }),
    );
  });

  it('shares an in-progress revocation so login cannot race past a late logout', async () => {
    const session = await import('@/lib/local-session');
    session.beginLocalLogout();
    let release!: () => void;
    mocks.logout.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const first = session.completePendingLocalLogout();
    const beforeLogin = session.completePendingLocalLogout();
    await vi.waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
    expect(session.hasPendingLocalLogout()).toBe(true);
    release();
    await Promise.all([first, beforeLogin]);
    expect(session.hasPendingLocalLogout()).toBe(false);
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it('does not revoke a new tab login because of an obsolete in-memory logout flag', async () => {
    const session = await import('@/lib/local-session');
    session.beginLocalLogout();
    // Another tab completed the old logout before signing in a new account.
    storage.delete('muhami-signed-out');
    storage.set(session.LOCAL_PRINCIPAL_KEY, 'office-b:user-b');
    expect(session.hasPendingLocalLogout()).toBe(false);
    await session.completePendingLocalLogout();
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it('rejects delayed account A isolation completion after a newer account B transition', async () => {
    const session = await import('@/lib/local-session');
    let release!: () => void;
    mocks.setOutboxIdentity.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const first = session.synchronizeLocalIdentity(a);
    const rejected = expect(first).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await session.synchronizeLocalIdentity(b);
    release();
    await rejected;
    expect(storage.get(session.LOCAL_PRINCIPAL_KEY)).toBe('office-b:user-b');
  });
});

it('clears cached account profile/device sessions and office data while preserving only the current auth principal', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  const client = new QueryClient();
  client.setQueryData(['auth', 'me'], a);
  client.setQueryData(['auth', 'profile'], {
    fullName: 'private A',
    email: 'private@example.test',
  });
  client.setQueryData(['auth', 'sessions'], [{ deviceLabel: 'private A phone' }]);
  client.setQueryData(['clients', 'list'], [{ fullName: 'private client A' }]);
  const session = await import('@/lib/local-session');
  await session.clearPrivateQueries(client);
  expect(client.getQueryData(['auth', 'me'])).toEqual(a);
  expect(client.getQueryData(['auth', 'profile'])).toBeUndefined();
  expect(client.getQueryData(['auth', 'sessions'])).toBeUndefined();
  expect(client.getQueryData(['clients', 'list'])).toBeUndefined();
  client.clear();
});
