'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ListNotificationsQuery,
  MarkReadInput,
  NotificationItem,
  NotificationPreferences,
  OfficeStatistics,
  Page,
  Watchlist,
  WatchlistCounts,
  WatchlistItem,
} from '@muhami/shared';
import { api } from '@/lib/api-client';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly: boolean) => ['notifications', 'list', unreadOnly] as const,
  unread: () => ['notifications', 'unread'] as const,
  preferences: () => ['notifications', 'preferences'] as const,
};

export const monitoringKeys = {
  all: ['monitoring'] as const,
  counts: () => ['monitoring', 'counts'] as const,
  list: (list: Watchlist) => ['monitoring', 'list', list] as const,
  statistics: () => ['monitoring', 'statistics'] as const,
};

export function useNotifications(unreadOnly = false) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(unreadOnly),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<NotificationItem>>('/notifications', {
        query: {
          unreadOnly: unreadOnly ? 'true' : undefined,
          limit: 25,
          cursor: pageParam,
        } satisfies Record<string, unknown> as Partial<ListNotificationsQuery> as never,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * The unread badge.
 *
 * Polled every two minutes rather than pushed: Web Push is not yet wired (see
 * the note in the Phase 13 report), and a badge that is two minutes stale is
 * honest, whereas one that never updates until reload is not.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkReadInput) =>
      api.post<{ updated: number }>('/notifications/read', input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => api.get<NotificationPreferences>('/notifications/preferences'),
  });
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPreferences) =>
      api.post<NotificationPreferences>('/notifications/preferences', input),
    onSuccess: (saved) => {
      queryClient.setQueryData(notificationKeys.preferences(), saved);
    },
  });
}

// ── Monitoring ──────────────────────────────────────────────────────────────

export function useWatchlistCounts(enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.counts(),
    queryFn: () => api.get<WatchlistCounts>('/monitoring/counts'),
    enabled,
    staleTime: 60_000,
  });
}

export function useWatchlist(list: Watchlist) {
  return useInfiniteQuery({
    queryKey: monitoringKeys.list(list),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<WatchlistItem>>('/monitoring/list', {
        query: { list, limit: 25, cursor: pageParam },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useOfficeStatistics() {
  return useQuery({
    queryKey: monitoringKeys.statistics(),
    queryFn: () => api.get<OfficeStatistics>('/monitoring/statistics'),
    staleTime: 5 * 60_000,
  });
}
