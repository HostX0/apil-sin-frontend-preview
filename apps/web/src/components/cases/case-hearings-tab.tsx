'use client';

import { CalendarClock, CheckCircle2, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  HEARING_OUTCOME_AR,
  HEARING_STATUS_AR,
  formatLongDateAr,
  toBaghdadDateKey,
  type HearingDetail,
} from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  Skeleton,
  cn,
} from '@muhami/ui';
import { HearingOutcomeSheet } from '@/components/calendar/hearing-outcome-sheet';
import { ApiError } from '@/lib/api-client';
import { useCaseHearings, useCreateHearing } from '@/lib/api/calendar';
import { Can } from '@/lib/auth-context';

export function CaseHearingsTab({ caseId }: { caseId: string }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [outcomeFor, setOutcomeFor] = useState<HearingDetail | null>(null);

  const query = useCaseHearings(caseId);
  const hearings = query.data ?? [];

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  const upcoming = hearings.filter((hearing) => hearing.status === 'SCHEDULED');
  const past = hearings.filter((hearing) => hearing.status !== 'SCHEDULED');

  return (
    <div className="space-y-4">
      <Can permission="hearing:create">
        <Button variant="secondary" size="sm" onClick={() => setScheduleOpen(true)}>
          <Plus className="size-4" />
          Schedule hearing
        </Button>
      </Can>

      {hearings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No hearings recorded"
          description="Schedule the first hearing to show it in the calendar and today’s dashboard."
        />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Upcoming hearings
              </h3>
              <Card>
                <ul className="divide-y divide-line">
                  {upcoming.map((hearing) => (
                    <HearingRow
                      key={hearing.id}
                      hearing={hearing}
                      onRecord={() => setOutcomeFor(hearing)}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Past hearings
              </h3>
              <Card>
                <ul className="divide-y divide-line">
                  {past.map((hearing) => (
                    <HearingRow key={hearing.id} hearing={hearing} />
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </>
      )}

      <ScheduleHearingSheet open={scheduleOpen} onOpenChange={setScheduleOpen} caseId={caseId} />

      {outcomeFor ? (
        <HearingOutcomeSheet
          open={Boolean(outcomeFor)}
          onOpenChange={(open) => !open && setOutcomeFor(null)}
          hearing={outcomeFor}
        />
      ) : null}
    </div>
  );
}

function HearingRow({ hearing, onRecord }: { hearing: HearingDetail; onRecord?: () => void }) {
  const at = new Date(hearing.scheduledAt);
  const isPast = at.getTime() < Date.now();

  return (
    <li className="flex items-start gap-3 p-3.5">
      <span
        aria-hidden
        className={cn(
          'mt-1 size-2 shrink-0 rounded-full',
          hearing.status === 'SCHEDULED' ? 'bg-event-blue' : 'bg-ink-subtle/40',
        )}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{formatLongDateAr(at)}</span>
          {hearing.hasTime ? (
            <span className="ltr-numerals text-xs text-ink-muted">
              {new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Baghdad',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              }).format(at)}
            </span>
          ) : null}
          <Badge tone={hearing.status === 'SCHEDULED' ? 'info' : 'neutral'}>
            {HEARING_STATUS_AR[hearing.status]}
          </Badge>
        </div>

        {hearing.purpose ? <p className="text-xs text-ink-muted">{hearing.purpose}</p> : null}

        {hearing.outcome ? (
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <CheckCircle2 className="size-3.5 text-success" aria-hidden />
            {HEARING_OUTCOME_AR[hearing.outcome]}
            {hearing.adjournmentReason ? ` — ${hearing.adjournmentReason}` : ''}
          </p>
        ) : null}

        {hearing.nextHearingAt ? (
          <p className="text-xs text-brand">
            Next hearing: {formatLongDateAr(new Date(hearing.nextHearingAt))}
          </p>
        ) : null}
      </div>

      {onRecord && isPast ? (
        <Can permission="hearing:outcome.record">
          <Button size="sm" variant="secondary" onClick={onRecord}>
            Record outcome
          </Button>
        </Can>
      ) : null}
    </li>
  );
}

function ScheduleHearingSheet({
  open,
  onOpenChange,
  caseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}) {
  const [date, setDate] = useState(toBaghdadDateKey(new Date()));
  const [time, setTime] = useState('09:00');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Set after the user has seen a clash and chosen to proceed anyway. */
  const [conflictAccepted, setConflictAccepted] = useState(false);

  const create = useCreateHearing();

  const submit = async () => {
    setError(null);
    try {
      await create.mutateAsync({
        caseId,
        date,
        time,
        purpose: purpose || undefined,
        acknowledgeConflict: conflictAccepted,
      });
      onOpenChange(false);
      setConflictAccepted(false);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'CONFLICT') {
        // A clash warns once; confirming re-submits with acknowledgement.
        setError(caught.messageAr);
        setConflictAccepted(true);
      } else {
        setError(caught instanceof ApiError ? caught.messageAr : 'Could not schedule the hearing.');
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Schedule hearing">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date" required>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setConflictAccepted(false);
                    setError(null);
                  }}
                />
              )}
            </Field>
            <Field label="Time">
              {(props) => (
                <Input
                  {...props}
                  type="time"
                  value={time}
                  onChange={(event) => {
                    setTime(event.target.value);
                    setConflictAccepted(false);
                    setError(null);
                  }}
                />
              )}
            </Field>
          </div>

          <Field label="Purpose">
            {(props) => (
              <Input
                {...props}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Example: Hearing"
              />
            )}
          </Field>

          {error ? (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning-subtle p-3">
              <p role="alert" className="text-sm text-warning">
                {error}
              </p>
              {conflictAccepted ? (
                <p className="text-xs text-ink-subtle">
                  Select Save again to continue despite the conflict.
                </p>
              ) : null}
            </div>
          ) : null}

          <SheetFooter>
            <Button variant="secondary" block onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button block loading={create.isPending} onClick={() => void submit()}>
              Save
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
