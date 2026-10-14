'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  Page,
  TransactionSummary,
  UpdateTransactionInput,
} from '@muhami/shared';
import { api } from '@/lib/api-client';

export const transactionKeys = { all: ['transactions'] as const };

export function useTransactions(filters: Partial<ListTransactionsQuery>, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...transactionKeys.all, filters],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<TransactionSummary>>('/transactions', {
        query: { ...filters, cursor: pageParam },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useCreateTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      api.post<TransactionSummary>('/transactions', input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useUpdateTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTransactionInput & { id: string }) =>
      api.patch<TransactionSummary>(`/transactions/${id}`, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
