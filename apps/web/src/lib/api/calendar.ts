'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CalendarItem,
  CalendarEventDetail,
  CreateEventInput,
  CreateHearingInput,
  HearingDetail,
  RecordOutcomeInput,
  UpdateHearingInput,
  UpdateEventInput,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { caseKeys } from '@/lib/api/cases';
import { dashboardKeys } from '@/lib/api/dashboard';
import { sendOrQueue } from '@/lib/offline';

export const calendarKeys = {
  all: ['calendar'] as const,
  range: (from: string, to: string, ownerId?: string) =>
    ['calendar', 'range', from, to, ownerId ?? 'office'] as const,
  caseHearings: (caseId: string) => ['calendar', 'case-hearings', caseId] as const,
  event: (id: string) => ['calendar', 'event', id] as const,
};

export function useCalendarRange(from: string, to: string, ownerId?: string) {
  return useQuery({
    queryKey: calendarKeys.range(from, to, ownerId),
    queryFn: () => api.get<CalendarItem[]>('/calendar', { query: { from, to, ownerId } }),
    enabled: Boolean(from && to),
    // Keeps the previous month on screen while the next one loads, so paging
    // does not flash an empty grid.
    placeholderData: (previous) => previous,
  });
}

export function useCaseHearings(caseId: string) {
  return useQuery({
    queryKey: calendarKeys.caseHearings(caseId),
    queryFn: () => api.get<HearingDetail[]>(`/cases/${caseId}/hearings`),
    enabled: Boolean(caseId),
  });
}

function invalidateCalendar(queryClient: ReturnType<typeof useQueryClient>, caseId?: string) {
  void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
  // Today's schedule and the week-hearings count both come from here.
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  if (caseId) void queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
}

export function useCreateHearing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHearingInput) => api.post<HearingDetail>('/hearings', input),
    onSuccess: (hearing) => invalidateCalendar(queryClient, hearing.caseId),
  });
}

export function useUpdateHearing(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHearingInput) => api.patch<HearingDetail>(`/hearings/${id}`, input),
    onSuccess: (hearing) => invalidateCalendar(queryClient, hearing.caseId),
  });
}

/**
 * Record the outcome and schedule the follow-up in one round trip.
 *
 * A single mutation on purpose: two calls would leave a window where the outcome
 * is saved but the next session is not, which is precisely the state that makes
 * a lawyer miss a hearing.
 *
 * This is also the one write that is *queueable offline*, and the reason the
 * outbox exists at all: it is performed standing in a courthouse corridor,
 * where there is often no signal, and losing it on the walk back to the car is
 * the failure Phase 15 was written to prevent. A queued entry carries the
 * idempotency key of the attempt that failed, so a replay after a timeout
 * returns the original result instead of recording the outcome twice.
 */
export function useRecordOutcome(hearingId: string, label?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordOutcomeInput) =>
      sendOrQueue<HearingDetail>({
        method: 'POST',
        path: `/hearings/${hearingId}/outcome`,
        body: input,
        labelAr: `Record hearing outcome${label ? ` · ${label}` : ''}`,
      }),
    onSuccess: (result) => {
      // A queued entry has changed nothing on the server yet; invalidating
      // would refetch and visibly discard what the user just typed.
      if (!result.queued) invalidateCalendar(queryClient, result.data.caseId);
    },
  });
}

export function useCancelHearing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/hearings/${id}`),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      api.post<{ id: string; occurrences: number }>('/events', input),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}

export function useCalendarEvent(id: string) {
  return useQuery({
    queryKey: calendarKeys.event(id),
    queryFn: () => api.get<CalendarEventDetail>(`/events/${id}`),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateEventInput & { id: string }) =>
      api.patch<void>(`/events/${id}`, input),
    onSuccess: (_data, input) => invalidateCalendar(queryClient, input.caseId),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      scope,
      version,
    }: {
      id: string;
      scope: 'occurrence' | 'series';
      version: number;
    }) => api.delete<{ removed: number }>(`/events/${id}`, { query: { scope, version } }),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}
