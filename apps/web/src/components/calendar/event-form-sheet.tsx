'use client';

import { useEffect, useState } from 'react';
import {
  EVENT_TYPE_AR,
  RECURRENCE_RULES,
  RECURRENCE_RULE_AR,
  type CreateEventInput,
  type CalendarEventDetail,
  type RecurrenceRule,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useCreateEvent, useUpdateEvent } from '@/lib/api/calendar';

/** Event types a user can create directly; hearings come from the case file. */
const CREATABLE_TYPES = ['APPOINTMENT', 'DEADLINE', 'REMINDER', 'URGENT_TASK'] as const;

export function EventFormSheet({
  open,
  onOpenChange,
  defaultDate,
  caseId,
  event,
  onReload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  caseId?: string;
  event?: CalendarEventDetail;
  onReload?: () => void;
}) {
  const isEdit = Boolean(event);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof CREATABLE_TYPES)[number]>('APPOINTMENT');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>('NONE');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [remind, setRemind] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [conflict, setConflict] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const create = useCreateEvent();
  const update = useUpdateEvent();

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? '');
    setType(event?.type ?? 'APPOINTMENT');
    setDate(event?.date ?? defaultDate);
    setTime(event?.time ?? '09:00');
    setEndTime(event?.endTime ?? '');
    setAllDay(event?.allDay ?? false);
    setLocation(event?.location ?? '');
    setNotes(event?.notes ?? '');
    setRecurrence('NONE');
    setRecurrenceEnd('');
    setRemind(event ? event.reminderOffsets.length > 0 : true);
    setFormError(null);
    setFieldErrors({});
    setConflict(false);
    setAdvancedOpen(Boolean(event?.location || event?.endTime || event?.seriesId));
  }, [open, defaultDate, event]);

  const submit = async () => {
    setFormError(null);
    setFieldErrors({});
    setConflict(false);

    const payload: CreateEventInput = {
      title,
      type,
      date,
      time: allDay ? undefined : time,
      endTime: allDay ? undefined : endTime || undefined,
      allDay,
      location: location || undefined,
      notes: notes || undefined,
      caseId: event?.caseId ?? caseId,
      ownerId: event?.ownerId ?? undefined,
      reminderOffsets: remind
        ? event?.reminderOffsets.length
          ? event.reminderOffsets
          : [1440]
        : [],
      recurrence: isEdit ? 'NONE' : recurrence,
      recurrenceEnd: isEdit || recurrence === 'NONE' ? undefined : recurrenceEnd || undefined,
    };

    try {
      if (event) await update.mutateAsync({ ...payload, id: event.id, version: event.version });
      else await create.mutateAsync(payload);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setConflict(error.code === 'VERSION_CONFLICT');
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
        else {
          setFormError('Review and complete the highlighted fields before saving.');
          if (
            ['endTime', 'location', 'recurrence', 'recurrenceEnd'].some(
              (key) => error.fieldErrors[key],
            )
          )
            setAdvancedOpen(true);
        }
      } else {
        setFormError('Could not save the appointment. Try again.');
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={isEdit ? 'Edit appointment' : 'Add an appointment or reminder'}
        description={
          isEdit
            ? 'Changes affect this appointment only. Other appointments in the series will remain.'
            : 'Choose the type and enter a title and date, then save. Court hearings are added from the case file.'
        }
      >
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">
              What would you like to add?
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {CREATABLE_TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setType(option);
                    if (option === 'DEADLINE') setAllDay(true);
                  }}
                  aria-pressed={type === option}
                  className={cn(
                    'rounded-md border p-2.5 text-sm font-medium transition-colors',
                    type === option
                      ? 'border-brand bg-brand-subtle text-brand'
                      : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                  )}
                >
                  {EVENT_TYPE_AR[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Address" required error={fieldErrors.title?.[0]}>
            {(props) => (
              <Input
                {...props}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Client meeting"
                autoFocus
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Date" required error={fieldErrors.date?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              )}
            </Field>
            <Field label="Time" error={fieldErrors.time?.[0]} hint="Baghdad time.">
              {(props) => (
                <Input
                  {...props}
                  type="time"
                  value={time}
                  disabled={allDay}
                  onChange={(event) => setTime(event.target.value)}
                />
              )}
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              className="size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
            />
            All day
          </label>

          <details
            className="rounded-md border border-line p-3"
            open={advancedOpen}
            onToggle={(change) => setAdvancedOpen(change.currentTarget.open)}
          >
            <summary className="min-h-6 cursor-pointer text-sm font-medium text-ink">
              Additional details: location and recurrence
            </summary>
            <div className="mt-3 space-y-4">
              {!allDay ? (
                <Field
                  label="End time"
                  error={fieldErrors.endTime?.[0]}
                  hint="Optional. Baghdad time."
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="time"
                      value={endTime}
                      onChange={(change) => setEndTime(change.target.value)}
                    />
                  )}
                </Field>
              ) : null}
              <Field label="Location" hint="Optional." error={fieldErrors.location?.[0]}>
                {(props) => (
                  <Input
                    {...props}
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Optional"
                  />
                )}
              </Field>

              {!isEdit ? (
                <Field label="Recurrence">
                  {(props) => (
                    <select
                      {...props}
                      value={recurrence}
                      onChange={(event) => setRecurrence(event.target.value as RecurrenceRule)}
                      className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
                    >
                      {RECURRENCE_RULES.map((rule) => (
                        <option key={rule} value={rule}>
                          {RECURRENCE_RULE_AR[rule]}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              ) : event?.seriesId ? (
                <p className="text-xs leading-6 text-ink-muted">
                  This appointment repeats {RECURRENCE_RULE_AR[event.recurrence]}. Changes here
                  apply to this appointment only.
                </p>
              ) : null}

              {!isEdit && recurrence !== 'NONE' ? (
                <Field
                  label="Recurrence ends on"
                  required
                  error={fieldErrors.recurrenceEnd?.[0]}
                  hint="Recurrence is limited to 200 events."
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={recurrenceEnd}
                      onChange={(event) => setRecurrenceEnd(event.target.value)}
                    />
                  )}
                </Field>
              ) : null}
            </div>
          </details>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={remind}
              onChange={(event) => setRemind(event.target.checked)}
              className="size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
            />
            {event?.reminderOffsets.length &&
            (event.reminderOffsets.length !== 1 || event.reminderOffsets[0] !== 1440)
              ? 'Enable this appointment’s current reminders'
              : 'Remind me one day before'}
          </label>

          <Field label="Notes" error={fieldErrors.notes?.[0]}>
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            )}
          </Field>

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}
          {event?.ownerName ? (
            <p className="text-xs text-ink-subtle">Appointment owner: {event.ownerName}</p>
          ) : null}
          {conflict && onReload ? (
            <Button variant="secondary" block onClick={onReload}>
              View the updated version before editing
            </Button>
          ) : null}

          <SheetFooter>
            <Button variant="secondary" block onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              block
              loading={create.isPending || update.isPending}
              disabled={!title.trim() || !date || (!allDay && !time) || conflict}
              onClick={() => void submit()}
            >
              Save appointment
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
