import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn(() => { throw new Error('Preview must never use the network'); });

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

type Client = { id: string; fullName: string; version: number };
type ClientPage = { items: Client[] };

describe('isolated frontend preview transport', () => {
  it('reads synthetic identity and records without fetching production', async () => {
    const { api } = await import('@/lib/api-client');
    const user = await api.get<{ email: string }>('/auth/me');
    const page = await api.get<ClientPage>('/clients');
    expect(user.email).toContain('.example');
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.some((client) => client.fullName === 'Sample Client')).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['https://production.example/api/clients', '//production.example/api/clients', 'clients'])(
    'rejects external or non-rooted paths: %s',
    async (path) => {
      const { apiFetch } = await import('@/lib/api-client');
      await expect(apiFetch(path)).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('supports create, read, update and delete using only module memory', async () => {
    const { api } = await import('@/lib/api-client');
    const initial = await api.get<ClientPage>('/clients');
    const created = await api.post<Client>('/clients', { fullName: 'Local test client' });
    expect((await api.get<ClientPage>('/clients')).items).toHaveLength(initial.items.length + 1);
    expect(await api.get<Client>(`/clients/${created.id}`)).toMatchObject({ fullName: 'Local test client' });
    const updated = await api.patch<Client>(`/clients/${created.id}`, { fullName: 'Updated local client' });
    expect(updated.fullName).toBe('Updated local client');
    expect(updated.version).toBeGreaterThan(created.version);
    await api.delete(`/clients/${created.id}`);
    expect((await api.get<ClientPage>('/clients')).items.map((client) => client.id)).not.toContain(created.id);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deduplicates repeated local mutations with the same request key', async () => {
    const { api } = await import('@/lib/api-client');
    const initial = await api.get<ClientPage>('/clients');
    const request = { fullName: 'One local client', idempotencyKey: 'preview-client-once' };
    const first = await api.post<Client>('/clients', request);
    const second = await api.post<Client>('/clients', request);
    expect(second).toEqual(first);
    expect((await api.get<ClientPage>('/clients')).items).toHaveLength(initial.items.length + 1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns detached data and resets mutations when the module reloads', async () => {
    const { api } = await import('@/lib/api-client');
    const initial = await api.get<ClientPage>('/clients');
    initial.items[0]!.fullName = 'Caller cannot change fixtures';
    expect((await api.get<ClientPage>('/clients')).items[0]!.fullName).toBe('Sample Client');
    await api.post('/clients', { fullName: 'Temporary local record' });
    vi.resetModules();
    const reloaded = await import('@/lib/api-client');
    const fresh = await reloaded.api.get<ClientPage>('/clients');
    expect(fresh.items).toHaveLength(initial.items.length);
    expect(fresh.items.some((client) => client.fullName === 'Temporary local record')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts locally and honors pre-send cancellation before a mutation', async () => {
    const { api, ApiError } = await import('@/lib/api-client');
    const controller = new AbortController();
    controller.abort();
    await expect(api.get('/clients', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const initial = await api.get<ClientPage>('/clients');
    await expect(api.post('/clients', { fullName: 'Cancelled' }, {
      beforeSend: () => { throw new ApiError({ type: 'about:blank', title: 'Cancelled', status: 403, code: 'FORBIDDEN', messageAr: 'Cancelled locally.' }); },
    })).rejects.toMatchObject({ status: 403 });
    expect((await api.get<ClientPage>('/clients')).items).toHaveLength(initial.items.length);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
