import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(join(__dirname, '../../public/sw.js'), 'utf8');

type WorkerEvent = { waitUntil: (work: Promise<unknown>) => void };

function worker() {
  const callbacks = new Map<string, (event: WorkerEvent) => void>();
  const unregister = vi.fn(async () => true);
  const skipWaiting = vi.fn(async () => undefined);
  const fetch = vi.fn();
  const caches = { open: vi.fn(), match: vi.fn(), delete: vi.fn() };
  runInNewContext(source, {
    self: {
      registration: { unregister },
      skipWaiting,
      addEventListener: (type: string, callback: (event: WorkerEvent) => void) => callbacks.set(type, callback),
    },
    fetch,
    caches,
  });
  return { callbacks, unregister, skipWaiting, fetch, caches };
}

describe('preview service worker isolation', () => {
  it('unregisters on activation without making requests or touching caches', async () => {
    const instance = worker();
    const pending: Promise<unknown>[] = [];
    instance.callbacks.get('activate')!({ waitUntil: (work) => pending.push(work) });
    await Promise.all(pending);
    expect(instance.unregister).toHaveBeenCalledOnce();
    expect(instance.fetch).not.toHaveBeenCalled();
    for (const operation of Object.values(instance.caches)) expect(operation).not.toHaveBeenCalled();
  });

  it('does not intercept navigation, API reads, or browser push', () => {
    const instance = worker();
    expect([...instance.callbacks.keys()].sort()).toEqual(['activate', 'install']);
    expect(instance.callbacks.has('fetch')).toBe(false);
    expect(instance.callbacks.has('push')).toBe(false);
    expect(instance.callbacks.has('notificationclick')).toBe(false);
  });

  it('allows an existing worker to retire immediately', () => {
    const instance = worker();
    instance.callbacks.get('install')!({ waitUntil: vi.fn() });
    expect(instance.skipWaiting).toHaveBeenCalledOnce();
  });

  it('never registers a service worker in the preview provider or registrar', () => {
    const providers = readFileSync(join(__dirname, '../components/providers.tsx'), 'utf8');
    const registrar = readFileSync(join(__dirname, '../components/pwa/service-worker-registrar.tsx'), 'utf8');
    expect(providers).not.toContain('ServiceWorkerRegistrar');
    expect(registrar).not.toContain('serviceWorker.register');
    expect(registrar).toContain('return null');
  });
});
