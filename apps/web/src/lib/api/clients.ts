'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityEntry,
  ClientDetail,
  ClientListItem,
  CreateClientInput,
  DuplicateMatch,
  ListClientsQuery,
  Page,
  UpdateClientInput,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { dashboardKeys } from '@/lib/api/dashboard';

export const clientKeys = {
  all: ['clients'] as const,
  list: (filters: Partial<ListClientsQuery>) => ['clients', 'list', filters] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
  activity: (id: string) => ['clients', 'activity', id] as const,
  duplicates: (mobile: string, nationalId: string, excludeId?: string) =>
    ['clients', 'duplicates', mobile, nationalId, excludeId ?? ''] as const,
};

export function useClientList(filters: Partial<ListClientsQuery>, enabled = true) {
  return useInfiniteQuery({
    queryKey: clientKeys.list(filters),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<ClientListItem>>('/clients', {
        query: {
          search: filters.search,
          kind: filters.kind,
          isFavorite: filters.isFavorite ? 'true' : undefined,
          sort: filters.sort ?? 'recent',
          limit: filters.limit ?? 25,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => api.get<ClientDetail>(`/clients/${id}`),
    enabled: Boolean(id),
  });
}

export function useClientActivity(id: string) {
  return useQuery({
    queryKey: clientKeys.activity(id),
    queryFn: () => api.get<ActivityEntry[]>(`/clients/${id}/activity`),
    enabled: Boolean(id),
  });
}

/**
 * Duplicate lookup, run while the user is still typing.
 *
 * Deliberately a query rather than part of the submit path: the warning has to
 * appear *before* the save, not as a rejected form afterwards.
 */
export function useDuplicateCheck(params: {
  mobile: string;
  nationalId: string;
  excludeId?: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: clientKeys.duplicates(params.mobile, params.nationalId, params.excludeId),
    queryFn: () =>
      api.get<DuplicateMatch[]>('/clients/check-duplicate', {
        query: {
          mobile: params.mobile || undefined,
          nationalId: params.nationalId || undefined,
          excludeId: params.excludeId,
        },
      }),
    enabled: params.enabled && (params.mobile.length >= 10 || params.nationalId.length >= 6),
    staleTime: 30_000,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => api.post<ClientDetail>('/clients', input),
    onSuccess: (created) => {
      queryClient.setQueryData(clientKeys.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
      // Clears the "brand-new office" onboarding card on the Today screen.
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => api.patch<ClientDetail>(`/clients/${id}`, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(clientKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useToggleFavorite(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isFavorite: boolean) => api.patch<void>(`/clients/${id}/favorite`, { isFavorite }),
    // Optimistic: a star must feel instant, and the rollback is trivial.
    onMutate: async (isFavorite) => {
      await queryClient.cancelQueries({ queryKey: clientKeys.detail(id) });
      const previous = queryClient.getQueryData<ClientDetail>(clientKeys.detail(id));
      if (previous) {
        queryClient.setQueryData(clientKeys.detail(id), { ...previous, isFavorite });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(clientKeys.detail(id), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/clients/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}
