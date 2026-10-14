'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AvailableTransition,
  CaseDetail,
  CaseListItem,
  CaseStatusHistoryEntry,
  ChangeCaseStatusInput,
  CourtDetail,
  CourtSummary,
  CreateCaseInput,
  CreateCourtInput,
  CreatePoaInput,
  ListCasesQuery,
  ListCourtsQuery,
  Page,
  UpdateCaseInput,
  UpdateCourtInput,
  UpdatePoaInput,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { lawyerKeys } from './lawyers';
import { dashboardKeys } from '@/lib/api/dashboard';

export const caseKeys = {
  all: ['cases'] as const,
  list: (filters: Partial<ListCasesQuery>) => ['cases', 'list', filters] as const,
  detail: (id: string) => ['cases', 'detail', id] as const,
  transitions: (id: string) => ['cases', 'transitions', id] as const,
  statusHistory: (id: string) => ['cases', 'status-history', id] as const,
};

export const courtKeys = {
  all: ['courts'] as const,
  list: (filters: Partial<ListCourtsQuery> = {}) => ['courts', 'list', filters] as const,
  detail: (id: string) => ['courts', 'detail', id] as const,
};

export function useCaseList(filters: Partial<ListCasesQuery>) {
  return useInfiniteQuery({
    queryKey: caseKeys.list(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<CaseListItem>>('/cases', {
        query: {
          search: filters.search,
          caseType: filters.caseType?.length ? filters.caseType.join(',') : undefined,
          status: filters.status?.length ? filters.status.join(',') : undefined,
          courtId: filters.courtId,
          clientId: filters.clientId,
          assignedToMe: filters.assignedToMe ? 'true' : undefined,
          isFavorite: filters.isFavorite ? 'true' : undefined,
          activeOnly: filters.activeOnly ? 'true' : undefined,
          sort: filters.sort ?? 'activity',
          limit: filters.limit ?? 25,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: () => api.get<CaseDetail>(`/cases/${id}`),
    enabled: Boolean(id),
  });
}

export function useCaseTransitions(id: string, enabled: boolean) {
  return useQuery({
    queryKey: caseKeys.transitions(id),
    queryFn: () => api.get<AvailableTransition[]>(`/cases/${id}/transitions`),
    enabled: enabled && Boolean(id),
    staleTime: 0,
  });
}

export function useCaseStatusHistory(id: string) {
  return useQuery({
    queryKey: caseKeys.statusHistory(id),
    queryFn: () => api.get<CaseStatusHistoryEntry[]>(`/cases/${id}/status-history`),
    enabled: Boolean(id),
  });
}

export function useCourts(filters: Partial<ListCourtsQuery> = {}) {
  return useQuery({
    queryKey: courtKeys.list(filters),
    queryFn: () =>
      api.get<CourtSummary[]>('/courts', {
        query: {
          search: filters.search,
          type: filters.type,
          jurisdiction: filters.jurisdiction,
          governorate: filters.governorate,
        },
      }),
    staleTime: 30 * 60_000,
  });
}

export function useCourt(id: string) {
  return useQuery({
    queryKey: courtKeys.detail(id),
    queryFn: () => api.get<CourtDetail>(`/courts/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourtInput) => api.post<CourtSummary>('/courts', input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: courtKeys.all }),
  });
}

export function useUpdateCourt(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCourtInput) => api.patch<CourtDetail>(`/courts/${id}`, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(courtKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: courtKeys.all });
    },
  });
}

export function useArchiveCourt(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<void>(`/courts/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: courtKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: courtKeys.all });
    },
  });
}

export function useSeedCourts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ created: number; skipped?: number; catalogVersion?: string }>(
        '/courts/seed-defaults',
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: courtKeys.all }),
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCaseInput) => api.post<CaseDetail>('/cases', input),
    onSuccess: (created) => {
      queryClient.setQueryData(caseKeys.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: caseKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: lawyerKeys.all });
    },
  });
}

export function useUpdateCase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCaseInput) => api.patch<CaseDetail>(`/cases/${id}`, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(caseKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: caseKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: lawyerKeys.all });
    },
  });
}

export function useChangeCaseStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeCaseStatusInput) =>
      api.post<{ status: string }>(`/cases/${id}/status`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: caseKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useToggleCaseFavorite(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isFavorite: boolean) => api.patch<void>(`/cases/${id}/favorite`, { isFavorite }),
    onMutate: async (isFavorite) => {
      await queryClient.cancelQueries({ queryKey: caseKeys.detail(id) });
      const previous = queryClient.getQueryData<CaseDetail>(caseKeys.detail(id));
      if (previous) queryClient.setQueryData(caseKeys.detail(id), { ...previous, isFavorite });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(caseKeys.detail(id), context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: caseKeys.all }),
  });
}

function invalidatePoaDependents(queryClient: ReturnType<typeof useQueryClient>, caseId: string) {
  void queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
  void queryClient.invalidateQueries({ queryKey: caseKeys.statusHistory(caseId) });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useAddPoa(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePoaInput) =>
      api.post<{ id: string }>(`/cases/${caseId}/powers-of-attorney`, input),
    onSuccess: () => invalidatePoaDependents(queryClient, caseId),
  });
}

export function useUpdatePoa(caseId: string, poaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePoaInput) =>
      api.patch<{ id: string }>(`/cases/${caseId}/powers-of-attorney/${poaId}`, input),
    onSuccess: () => invalidatePoaDependents(queryClient, caseId),
  });
}

export function useDeletePoa(caseId: string, poaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<void>(`/cases/${caseId}/powers-of-attorney/${poaId}`),
    onSuccess: () => invalidatePoaDependents(queryClient, caseId),
  });
}
