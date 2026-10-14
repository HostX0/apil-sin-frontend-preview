'use client';

import { useQuery } from '@tanstack/react-query';
import type { TodayDashboard } from '@muhami/shared';
import { api } from '@/lib/api-client';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  today: () => ['dashboard', 'today'] as const,
};

/**
 * The Today payload — one request for the whole screen.
 *
 * Refetched on focus, unlike the app-wide default: this is the screen a lawyer
 * returns to after every other action, and a stale hearing count on it is worse
 * than a brief spinner. Every mutation in the app invalidates it through the
 * module query keys, so this is a backstop rather than the primary mechanism.
 */
export function useTodayDashboard() {
  return useQuery({
    queryKey: dashboardKeys.today(),
    queryFn: () => api.get<TodayDashboard>('/dashboard/today'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
