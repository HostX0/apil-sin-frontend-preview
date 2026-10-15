import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn(() => {
  throw new Error('Preview must never use the network');
});

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

  it.each([
    'https://production.example/api/clients',
    '//production.example/api/clients',
    'clients',
  ])('rejects external or non-rooted paths: %s', async (path) => {
    const { apiFetch } = await import('@/lib/api-client');
    await expect(apiFetch(path)).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('supports create, read, update and delete using only module memory', async () => {
    const { api } = await import('@/lib/api-client');
    const initial = await api.get<ClientPage>('/clients');
    const created = await api.post<Client>('/clients', { fullName: 'Local test client' });
    expect((await api.get<ClientPage>('/clients')).items).toHaveLength(initial.items.length + 1);
    expect(await api.get<Client>(`/clients/${created.id}`)).toMatchObject({
      fullName: 'Local test client',
    });
    const updated = await api.patch<Client>(`/clients/${created.id}`, {
      fullName: 'Updated local client',
    });
    expect(updated.fullName).toBe('Updated local client');
    expect(updated.version).toBeGreaterThan(created.version);
    await api.delete(`/clients/${created.id}`);
    expect((await api.get<ClientPage>('/clients')).items.map((client) => client.id)).not.toContain(
      created.id,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps multiple new clients and cases separate from existing sample records', async () => {
    const { api } = await import('@/lib/api-client');
    type ClientDetails = Client & {
      caseCount: number;
      activeCaseCount: number;
      notes: string | null;
    };
    type CaseDetails = {
      id: string;
      clientId: string;
      subject: string;
      counts: { hearings: number; documents: number };
      compliance: { outstandingBalance: string };
    };
    const beforeClients = await api.get<ClientPage>('/clients');
    const beforeCases = await api.get<{ items: CaseDetails[] }>('/cases');
    const first = await api.post<ClientDetails>('/clients', {
      fullName: 'First demo client',
      mobile: '+9647700000001',
    });
    const second = await api.post<ClientDetails>('/clients', {
      fullName: 'Second demo client',
      mobile: '+9647700000002',
    });
    expect(first.id).not.toBe(second.id);
    expect(beforeClients.items.map((client) => client.id)).not.toContain(first.id);
    expect(first).toMatchObject({ caseCount: 0, activeCaseCount: 0, notes: null });
    expect(second).toMatchObject({ caseCount: 0, activeCaseCount: 0, notes: null });
    const input = {
      clientId: first.id,
      clientRole: 'PLAINTIFF',
      courtId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      caseType: 'CIVIL',
      typeCode: 'C',
      year: 2026,
      opponents: [],
      assignedLawyerIds: [],
    };
    const firstCase = await api.post<CaseDetails>('/cases', {
      ...input,
      serial: 301,
      subject: 'First demo matter',
    });
    const secondCase = await api.post<CaseDetails>('/cases', {
      ...input,
      clientId: second.id,
      serial: 302,
      subject: 'Second demo matter',
    });
    expect(firstCase.id).not.toBe(secondCase.id);
    expect(beforeCases.items.map((record) => record.id)).not.toContain(firstCase.id);
    expect(firstCase).toMatchObject({
      counts: { hearings: 0, documents: 0 },
      compliance: { outstandingBalance: '0' },
    });
    expect((await api.get<{ items: CaseDetails[] }>('/cases')).items).toHaveLength(
      beforeCases.items.length + 2,
    );
    expect(await api.get<ClientDetails>(`/clients/${first.id}`)).toMatchObject({
      fullName: 'First demo client',
      caseCount: 1,
      activeCaseCount: 1,
    });
    expect(await api.get<ClientDetails>(`/clients/${second.id}`)).toMatchObject({
      fullName: 'Second demo client',
      caseCount: 1,
      activeCaseCount: 1,
    });
    expect(await api.get<CaseDetails>(`/cases/${beforeCases.items[0]!.id}`)).toMatchObject({
      subject: beforeCases.items[0]!.subject,
    });
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
    await expect(api.get('/clients', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    const initial = await api.get<ClientPage>('/clients');
    await expect(
      api.post(
        '/clients',
        { fullName: 'Cancelled' },
        {
          beforeSend: () => {
            throw new ApiError({
              type: 'about:blank',
              title: 'Cancelled',
              status: 403,
              code: 'FORBIDDEN',
              messageAr: 'Cancelled locally.',
            });
          },
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect((await api.get<ClientPage>('/clients')).items).toHaveLength(initial.items.length);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
