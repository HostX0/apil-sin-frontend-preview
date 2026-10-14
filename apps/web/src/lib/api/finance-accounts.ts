'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateFinanceAccountInput,
  CreateFinanceMovementInput,
  FinanceAccountSummary,
  FinanceActivity,
  FinanceActivityQuery,
  FinanceWorkspaceSummary,
  UpdateFinanceAccountInput,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { dashboardKeys } from './dashboard';
import { financeKeys } from './finance';

export const financeAccountKeys = {
  all: ['finance', 'accounts'] as const,
  list: (filters: { clientId?: string; transactionId?: string }) =>
    ['finance', 'accounts', 'list', filters] as const,
  detail: (id: string) => ['finance', 'accounts', 'detail', id] as const,
  workspace: ['finance', 'workspace-summary'] as const,
  activity: (period: FinanceActivityQuery) => ['finance', 'activity', period] as const,
};

export function useFinanceAccounts(
  filters: { clientId?: string; transactionId?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: financeAccountKeys.list(filters),
    queryFn: () => api.get<FinanceAccountSummary[]>('/finance/accounts', { query: filters }),
    enabled,
  });
}

export function useFinanceAccount(id: string, enabled = true) {
  return useQuery({
    queryKey: financeAccountKeys.detail(id),
    queryFn: () => api.get<FinanceAccountSummary>(`/finance/accounts/${id}`),
    enabled: enabled && Boolean(id),
  });
}

export function useFinanceWorkspaceSummary(enabled = true) {
  return useQuery({
    queryKey: financeAccountKeys.workspace,
    queryFn: () => api.get<FinanceWorkspaceSummary>('/finance/workspace-summary'),
    enabled,
  });
}

export function useFinanceActivity(period: FinanceActivityQuery, enabled = true) {
  return useQuery({
    queryKey: financeAccountKeys.activity(period),
    queryFn: () => api.get<FinanceActivity>('/finance/activity', { query: period }),
    enabled,
  });
}

function useFinanceWrite<T>(write: (input: T) => Promise<FinanceAccountSummary>) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: write,
    onSuccess: (account) => {
      queryClient.setQueryData(financeAccountKeys.detail(account.id), account);
      void queryClient.invalidateQueries({ queryKey: financeKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useCreateFinanceAccount() {
  return useFinanceWrite((input: CreateFinanceAccountInput) =>
    api.post<FinanceAccountSummary>('/finance/accounts', input),
  );
}

export function useUpdateFinanceAccount(id: string) {
  return useFinanceWrite((input: UpdateFinanceAccountInput) =>
    api.patch<FinanceAccountSummary>(`/finance/accounts/${id}`, input),
  );
}

export function useCreateFinanceMovement(id: string) {
  return useFinanceWrite((input: CreateFinanceMovementInput) =>
    api.post<FinanceAccountSummary>(`/finance/accounts/${id}/movements`, input),
  );
}

export function useVoidFinanceMovement(id: string) {
  return useFinanceWrite((input: { reason: string }) =>
    api.post<FinanceAccountSummary>(`/finance/movements/${id}/void`, input),
  );
}
