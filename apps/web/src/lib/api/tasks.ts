'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CompleteTaskInput,
  CreateTaskInput,
  ListTasksQuery,
  Page,
  TaskCounts,
  TaskSummary,
  UpdateTaskInput,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { calendarKeys } from '@/lib/api/calendar';
import { dashboardKeys } from '@/lib/api/dashboard';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (filters: Partial<ListTasksQuery>) => ['tasks', 'list', filters] as const,
  counts: () => ['tasks', 'counts'] as const,
};

/**
 * A task change moves three surfaces: the task list, the calendar (tasks appear
 * on the day they are due) and the Today dashboard. Invalidating all three from
 * one place is why every mutation below shares this.
 */
function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: taskKeys.all });
  void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useTasks(filters: Partial<ListTasksQuery> = {}) {
  return useInfiniteQuery({
    queryKey: taskKeys.list(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<TaskSummary>>('/tasks', { query: { ...filters, limit: 30, cursor: pageParam } }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useTaskCounts() {
  return useQuery({
    queryKey: taskKeys.counts(),
    queryFn: () => api.get<TaskCounts>('/tasks/counts'),
    staleTime: 60_000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<TaskSummary>('/tasks', input),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTaskInput & { id: string }) =>
      api.patch<TaskSummary>(`/tasks/${id}`, input),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

/**
 * Ticking a task off, optimistically.
 *
 * The one interaction that happens in bursts — a lawyer clearing a list taps
 * five in a row — so it updates the cache immediately and rolls back on
 * failure. Waiting for a round trip per tap on Iraqi mobile data makes the list
 * feel broken even when every request succeeds.
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, done }: CompleteTaskInput & { id: string }) =>
      api.post<TaskSummary>(`/tasks/${id}/complete`, { done }),

    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const previous = queryClient.getQueriesData<{ pages: Array<Page<TaskSummary>> }>({
        queryKey: taskKeys.all,
      });

      queryClient.setQueriesData<{ pages: Array<Page<TaskSummary>> }>(
        { queryKey: taskKeys.all },
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((task) =>
                    task.id === id
                      ? {
                          ...task,
                          status: done ? 'DONE' : 'OPEN',
                          isOverdue: done ? false : task.isOverdue,
                        }
                      : task,
                  ),
                })),
              }
            : data,
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => invalidateTasks(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/tasks/${id}`),
    onSuccess: () => invalidateTasks(queryClient),
  });
}
