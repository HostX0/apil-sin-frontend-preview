'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuditEntryItem,
  CreateRoleInput,
  InviteResult,
  InviteUserInput,
  ListAuditQuery,
  ListUsersQuery,
  Page,
  RoleSummary,
  SetUserStatusInput,
  UpdateRoleInput,
  UpdateUserInput,
  UserSummary,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { lawyerKeys } from './lawyers';

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: adminKeys.users });
  void queryClient.invalidateQueries({ queryKey: lawyerKeys.all });
}

export const adminKeys = {
  users: ['admin', 'users'] as const,
  userList: (filters: Partial<ListUsersQuery>) => ['admin', 'users', 'list', filters] as const,
  roles: ['admin', 'roles'] as const,
  audit: ['admin', 'audit'] as const,
  auditList: (filters: Partial<ListAuditQuery>) => ['admin', 'audit', 'list', filters] as const,
  auditActors: () => ['admin', 'audit', 'actors'] as const,
};

// ── Users ───────────────────────────────────────────────────────────────────

export function useUsers(filters: Partial<ListUsersQuery> = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: adminKeys.userList(filters),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<UserSummary>>('/users', {
        query: { ...filters, limit: 50, cursor: pageParam },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => api.post<InviteResult>('/users', input),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: string }) =>
      api.patch<UserSummary>(`/users/${id}`, input),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: SetUserStatusInput & { id: string }) =>
      api.post<UserSummary>(`/users/${id}/status`, input),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/users/${id}`),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

// ── Roles ───────────────────────────────────────────────────────────────────

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: adminKeys.roles,
    queryFn: () => api.get<RoleSummary[]>('/roles'),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => api.post<RoleSummary>('/roles', input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.roles }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateRoleInput & { id: string }) =>
      api.patch<RoleSummary>(`/roles/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.roles });
      // A role edit changes what the *current* user may do too.
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useResetRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<RoleSummary>(`/roles/${id}/reset`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.roles }),
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/roles/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.roles }),
  });
}

// ── Audit ───────────────────────────────────────────────────────────────────

export function useAuditLog(filters: Partial<ListAuditQuery> = {}) {
  return useInfiniteQuery({
    queryKey: adminKeys.auditList(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<AuditEntryItem>>('/audit', {
        query: { ...filters, limit: 40, cursor: pageParam },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useAuditActors() {
  return useQuery({
    queryKey: adminKeys.auditActors(),
    queryFn: () => api.get<Array<{ id: string; label: string }>>('/audit/actors'),
    staleTime: 10 * 60_000,
  });
}
