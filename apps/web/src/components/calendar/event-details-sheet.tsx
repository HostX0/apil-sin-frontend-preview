'use client';

import { CalendarDays, MapPin, Pencil, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EVENT_TYPE_AR, formatLongDateAr } from '@/lib/ui-shared';
import { Badge, Button, ErrorState, Sheet, SheetContent, SheetFooter, Skeleton } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useCalendarEvent, useDeleteEvent } from '@/lib/api/calendar';
import { useAuth } from '@/lib/auth-context';
import { EventFormSheet } from './event-form-sheet';

export function EventDetailsSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { can, user } = useAuth();
  const query = useCalendarEvent(id);
  const remove = useDeleteEvent();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const detail = query.data;
  const mayManage = Boolean(detail && (can('event:read.all') || detail.ownerId === user?.id));

  const reload = () => {
    setEditing(false);
    setError(null);
    setConflict(false);
    void query.refetch();
  };

  const deleteAppointment = async () => {
    if (!detail || !mayManage || !can('event:delete')) return;
    const question = detail.seriesId
      ? `Delete appointment “${detail.title}” for this day only? Other recurring appointments will remain.`
      : `Delete appointment “${detail.title}”? This cannot be undone.`;
    if (!window.confirm(question)) return;
    setError(null);
    try {
      await remove.mutateAsync({ id: detail.id, scope: 'occurrence', version: detail.version });
      onClose();
    } catch (caught) {
      setConflict(caught instanceof ApiError && caught.code === 'VERSION_CONFLICT');
      setError(
        caught instanceof ApiError
          ? caught.messageAr
          : 'Could not delete the appointment. Try again.',
      );
    }
  };

  if (editing && detail) {
    return (
      <EventFormSheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        defaultDate={detail.date}
        event={detail}
        onReload={reload}
      />
    );
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        title="Appointment details"
        description="Review the appointment, or edit it if the time or requirements change."
      >
        {query.isPending || query.isFetching ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState
            description={
              query.error instanceof ApiError
                ? query.error.messageAr
                : 'Could not load the appointment.'
            }
            onRetry={() => void query.refetch()}
          />
        ) : detail ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Badge>{EVENT_TYPE_AR[detail.type]}</Badge>
              <h2 className="text-lg font-semibold leading-8 text-ink">{detail.title}</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="flex items-center gap-2 text-xs text-ink-subtle">
                  <CalendarDays aria-hidden className="size-4 shrink-0 text-brand" />
                  Appointment in Baghdad time
                </dt>
                <dd className="ms-6 mt-1 text-ink">
                  {formatLongDateAr(new Date(`${detail.date}T12:00:00+03:00`))} ·{' '}
                  {detail.allDay ? 'All day' : (detail.time ?? 'No time set')}
                  {!detail.allDay && detail.endTime ? ` to ${detail.endTime}` : ''}
                </dd>
              </div>
              {detail.location ? (
                <div>
                  <dt className="flex items-center gap-2 text-xs text-ink-subtle">
                    <MapPin aria-hidden className="size-4 shrink-0 text-brand" />
                    Location
                  </dt>
                  <dd className="ms-6 mt-1 whitespace-pre-wrap break-words text-ink">
                    {detail.location}
                  </dd>
                </div>
              ) : null}
              {detail.ownerName ? (
                <div>
                  <dt className="flex items-center gap-2 text-xs text-ink-subtle">
                    <UserRound aria-hidden className="size-4 shrink-0 text-brand" />
                    Appointment owner
                  </dt>
                  <dd className="ms-6 mt-1 text-ink">{detail.ownerName}</dd>
                </div>
              ) : null}
            </dl>
            {detail.notes ? (
              <div className="rounded-xl bg-surface-sunken p-3">
                <p className="text-xs font-medium text-ink-subtle">Notes</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                  {detail.notes}
                </p>
              </div>
            ) : null}
            {detail.caseId ? (
              <Button variant="secondary" asChild>
                <Link href={`/cases/${detail.caseId}`}>Open linked case</Link>
              </Button>
            ) : null}
            {detail.seriesId ? (
              <p className="text-xs leading-6 text-ink-subtle">
                This appointment is part of a recurring series. Editing or deleting it affects this
                appointment only.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {conflict ? (
              <Button block variant="secondary" onClick={reload}>
                View the updated version before continuing
              </Button>
            ) : null}
            <SheetFooter>
              {mayManage && can('event:delete') ? (
                <Button
                  variant="ghost"
                  className="text-danger"
                  disabled={conflict}
                  loading={remove.isPending}
                  onClick={() => void deleteAppointment()}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Delete appointment
                </Button>
              ) : null}
              {mayManage && can('event:update') ? (
                <Button disabled={conflict || remove.isPending} onClick={() => setEditing(true)}>
                  <Pencil className="size-4" aria-hidden />
                  Edit appointment
                </Button>
              ) : (
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              )}
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
