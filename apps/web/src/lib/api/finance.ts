'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Balance,
  CaseFeeSummary,
  CreateExpenseInput,
  CreateFeeAgreementInput,
  CreditNoteInput,
  ExpenseSummary,
  FeeAgreementSummary,
  IssueReceiptInput,
  ListExpensesQuery,
  ListReceiptsQuery,
  OfficeFinanceSummary,
  Page,
  PaymentSummary,
  ReceiptSummary,
  RecordPaymentInput,
  RecordCasePaymentInput,
  SetCaseFeeInput,
  VoidReceiptInput,
  UpdateExpenseInput,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { caseKeys } from '@/lib/api/cases';
import { dashboardKeys } from '@/lib/api/dashboard';

export const financeKeys = {
  all: ['finance'] as const,
  summary: () => ['finance', 'summary'] as const,
  caseBalance: (caseId: string) => ['finance', 'balance', 'case', caseId] as const,
  clientBalance: (clientId: string) => ['finance', 'balance', 'client', clientId] as const,
  receipts: (filters: Partial<ListReceiptsQuery>) => ['finance', 'receipts', filters] as const,
  expenses: (filters: Partial<ListExpensesQuery>) => ['finance', 'expenses', filters] as const,
  feeAgreements: (caseId: string) => ['finance', 'fee-agreements', caseId] as const,
  caseFees: (caseId?: string) => ['finance', 'case-fees', caseId ?? 'all'] as const,
  clientCaseFees: (clientId: string) => ['finance', 'client-case-fees', clientId] as const,
};

export function useCaseFees(caseId?: string, enabled = true) {
  return useQuery({
    queryKey: financeKeys.caseFees(caseId),
    enabled: enabled && Boolean(caseId),
    queryFn: () => api.get<CaseFeeSummary>(`/cases/${caseId}/fees`),
  });
}

export function useCaseFeeList(enabled = true) {
  return useQuery({
    queryKey: financeKeys.caseFees(),
    enabled,
    queryFn: () => api.get<CaseFeeSummary[]>('/finance/case-fees'),
  });
}

export function useClientCaseFees(clientId: string, enabled = true) {
  return useQuery({
    queryKey: financeKeys.clientCaseFees(clientId),
    enabled: enabled && Boolean(clientId),
    queryFn: () => api.get<CaseFeeSummary[]>(`/clients/${clientId}/fees`),
  });
}

export function useSetCaseFee(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (input: SetCaseFeeInput) =>
      api.patch<CaseFeeSummary>(`/cases/${caseId}/fees`, input),
    onSuccess: () => invalidateFinance(queryClient, caseId),
  });
}

export function useRecordCasePayment(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (input: RecordCasePaymentInput) =>
      api.post<CaseFeeSummary>(`/cases/${caseId}/payments`, input),
    onSuccess: () => invalidateFinance(queryClient, caseId),
  });
}

/**
 * A fresh idempotency key per attempt at a money-affecting write.
 *
 * Generated when the form opens and reused across retries of that same
 * submission, so a dropped connection re-sends the *same* key and the API
 * returns the original receipt instead of minting a second one.
 */
export function newIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>, caseId?: string | null) {
  void queryClient.invalidateQueries({ queryKey: financeKeys.all });
  // The Today card reads the same outstanding total; a receipt issued here must
  // move it without waiting for a focus refetch.
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  if (caseId) void queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
}

// ── Reads ───────────────────────────────────────────────────────────────────

export function useOfficeFinanceSummary(enabled = true) {
  return useQuery({
    queryKey: financeKeys.summary(),
    queryFn: () => api.get<OfficeFinanceSummary>('/finance/summary'),
    enabled,
  });
}

export function useCaseBalance(caseId: string) {
  return useQuery({
    queryKey: financeKeys.caseBalance(caseId),
    queryFn: () => api.get<Balance>(`/cases/${caseId}/balance`),
    enabled: Boolean(caseId),
  });
}

export function useClientBalance(clientId: string, enabled = true) {
  return useQuery({
    queryKey: financeKeys.clientBalance(clientId),
    queryFn: () => api.get<Balance>(`/clients/${clientId}/balance`),
    enabled: enabled && Boolean(clientId),
  });
}

export function useReceipts(filters: Partial<ListReceiptsQuery>) {
  return useInfiniteQuery({
    queryKey: financeKeys.receipts(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<ReceiptSummary>>('/receipts', {
        query: {
          clientId: filters.clientId,
          caseId: filters.caseId,
          outstandingOnly: filters.outstandingOnly ? 'true' : undefined,
          includeVoided: filters.includeVoided ? 'true' : undefined,
          limit: filters.limit ?? 25,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useExpenses(filters: Partial<ListExpensesQuery>) {
  return useInfiniteQuery({
    queryKey: financeKeys.expenses(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<ExpenseSummary>>('/expenses', {
        query: {
          caseId: filters.caseId,
          category: filters.category,
          billableOnly: filters.billableOnly ? 'true' : undefined,
          limit: filters.limit ?? 25,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useFeeAgreements(caseId: string) {
  return useQuery({
    queryKey: financeKeys.feeAgreements(caseId),
    queryFn: () => api.get<FeeAgreementSummary[]>(`/cases/${caseId}/fee-agreements`),
    enabled: Boolean(caseId),
  });
}

// ── Writes ──────────────────────────────────────────────────────────────────

export function useIssueReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueReceiptInput) => api.post<ReceiptSummary>('/receipts', input),
    onSuccess: (receipt) => invalidateFinance(queryClient, receipt.caseId),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => api.post<PaymentSummary>('/payments', input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useVoidReceipt(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VoidReceiptInput) =>
      api.post<ReceiptSummary>(`/receipts/${id}/void`, input),
    onSuccess: (receipt) => invalidateFinance(queryClient, receipt.caseId),
  });
}

export function useCreditNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreditNoteInput) =>
      api.post<ReceiptSummary>(`/receipts/${id}/credit-note`, input),
    onSuccess: (receipt) => invalidateFinance(queryClient, receipt.caseId),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (input: CreateExpenseInput) => api.post<ExpenseSummary>('/expenses', input),
    onSuccess: (expense) => invalidateFinance(queryClient, expense.caseId),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/expenses/${id}`),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateExpense(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (input: UpdateExpenseInput) => api.patch<ExpenseSummary>(`/expenses/${id}`, input),
    onSuccess: (expense) => invalidateFinance(queryClient, expense.caseId),
  });
}

export function useCreateFeeAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeeAgreementInput) =>
      api.post<FeeAgreementSummary>('/fee-agreements', input),
    onSuccess: (agreement) => invalidateFinance(queryClient, agreement.caseId),
  });
}
