import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function database() {
  const write: Record<string, unknown> = { result: undefined };
  const read: Record<string, unknown> = { result: [{ id: 'private-a', queuedAt: 1 }] };
  const transaction: Record<string, unknown> = {
    objectStore: () => ({ clear: () => write, index: () => ({ getAll: () => read }) }),
  };
  const open: Record<string, unknown> = { result: { transaction: () => transaction } };
  vi.stubGlobal('indexedDB', {
    open: () => {
      queueMicrotask(() => (open.onsuccess as () => void)());
      return open;
    },
  });
  return { write, read, transaction };
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('IndexedDB committed lifecycle operations', () => {
  it('does not finish the logout purge before the transaction commits', async () => {
    const db = database();
    const { idbClear } = await import('@/lib/idb');
    let finished = false;
    const clearing = idbClear().then(() => {
      finished = true;
    });
    await vi.waitFor(() => expect(db.write.onsuccess).toBeTypeOf('function'));
    (db.write.onsuccess as () => void)();
    await Promise.resolve();
    expect(finished).toBe(false);
    (db.transaction.oncomplete as () => void)();
    await clearing;
    expect(finished).toBe(true);
  });

  it('does not publish confidential read results from a subsequently aborted transaction', async () => {
    const db = database();
    const { idbGetAll } = await import('@/lib/idb');
    const reading = idbGetAll();
    await vi.waitFor(() => expect(db.read.onsuccess).toBeTypeOf('function'));
    (db.read.onsuccess as () => void)();
    (db.transaction.onabort as () => void)();
    expect(await reading).toEqual([]);
  });
});
