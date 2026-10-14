'use client';

/**
 * A minimal promise wrapper over IndexedDB.
 *
 * Hand-written rather than pulling in `idb`: the app needs exactly four
 * operations against one object store, and a dependency that ships a full
 * transaction abstraction to provide them is weight on a phone's first load
 * for no benefit.
 *
 * Every operation degrades to a no-op when IndexedDB is unavailable — private
 * browsing on some engines, a storage quota refusal, an embedded webview. The
 * outbox then behaves like a session that has never been offline, which is a
 * worse experience but not a broken one.
 */

const DB_NAME = 'muhami';
const DB_VERSION = 1;

export const OUTBOX_STORE = 'outbox';

let connection: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  connection ??= new Promise<IDBDatabase | null>((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
        // Replay must be in the order the user performed the actions: a payment
        // recorded against a receipt created moments earlier cannot go first.
        store.createIndex('queuedAt', 'queuedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    // Another tab is holding an old version open. Rather than hang, give up and
    // run without persistence in this tab.
    request.onblocked = () => resolve(null);
  });

  return connection;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise<T | null>((resolve) => {
    try {
      const transaction = db.transaction(OUTBOX_STORE, mode);
      const request = fn(transaction.objectStore(OUTBOX_STORE));
      let result: T | null = null;
      request.onsuccess = () => {
        result = request.result;
      };
      // A successful request can still belong to an aborted transaction.
      // Resolve writes only after the commit, including the logout purge.
      transaction.oncomplete = () => resolve(result);
      request.onerror = () => resolve(null);
      transaction.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbGetAll<T>(): Promise<T[]> {
  const rows = await withStore<T[]>('readonly', (store) => store.index('queuedAt').getAll());
  return rows ?? [];
}

export async function idbPut<T>(value: T): Promise<void> {
  await withStore('readwrite', (store) => store.put(value) as IDBRequest<IDBValidKey>);
}

export async function idbDelete(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id) as IDBRequest<undefined>);
}

export async function idbClear(): Promise<void> {
  await withStore('readwrite', (store) => store.clear() as IDBRequest<undefined>);
}
