'use client';

import { AlertTriangle, CloudOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  HEARING_OUTCOMES,
  HEARING_OUTCOME_AR,
  formatLongDateAr,
  type HearingDetail,
  type HearingOutcome,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useRecordOutcome } from '@/lib/api/calendar';

/**
 * Record hearing outcome — the highest-value interaction in the product.
 *
 * Target: outcome recorded and the next session scheduled in under thirty
 * seconds on a phone, in a courthouse corridor. The form never invents a court
 * time: a follow-up date may be saved with its time explicitly unknown.
 */
export function HearingOutcomeSheet({
  open,
  onOpenChange,
  hearing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hearing: HearingDetail;
}) {
  const [outcome, setOutcome] = useState<HearingOutcome>('ADJOURNED');
  const [adjournmentReason, setAdjournmentReason] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(true);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [expectedJudgmentDate, setExpectedJudgmentDate] = useState('');
  const [advanceStatus, setAdvanceStatus] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [acknowledgeConflict, setAcknowledgeConflict] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const record = useRecordOutcome(hearing.id, hearing.caseNumber);
  const [queued, setQueued] = useState(false);

  const canAdvanceCase = useMemo(
    () =>
      (outcome === 'ADJOURNED' && hearing.caseStatus === 'NOTIFICATION') ||
      (outcome === 'RESERVED_FOR_JUDGMENT' && hearing.caseStatus === 'HEARING'),
    [hearing.caseStatus, outcome],
  );

  useEffect(() => {
    if (!open) return;
    setQueued(false);
    setOutcome('ADJOURNED');
    setAdjournmentReason('');
    setNotes('');
    setScheduleNext(true);
    setNextDate('');
    setNextTime('');
    setExpectedJudgmentDate('');
    setConflictMessage(null);
    setAcknowledgeConflict(false);
    setFormError(null);
    setFieldErrors({});
  }, [open]);

  useEffect(() => {
    setScheduleNext(outcome === 'ADJOURNED');
  }, [outcome]);

  useEffect(() => {
    setAdvanceStatus(canAdvanceCase);
  }, [canAdvanceCase]);

  const resetConflict = () => {
    setConflictMessage(null);
    setAcknowledgeConflict(false);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.acknowledgeConflict;
      return next;
    });
  };

  const submit = async () => {
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await record.mutateAsync({
        outcome,
        notes: notes || undefined,
        adjournmentReason: adjournmentReason || undefined,
        nextDate: scheduleNext && nextDate ? nextDate : undefined,
        // Empty means the court has not fixed a time. Never manufacture 09:00.
        nextTime: scheduleNext && nextDate && nextTime ? nextTime : undefined,
        advanceCaseStatus: canAdvanceCase ? advanceStatus : false,
        expectedJudgmentDate:
          canAdvanceCase && advanceStatus && expectedJudgmentDate
            ? expectedJudgmentDate
            : undefined,
        acknowledgeConflict: acknowledgeConflict || undefined,
      });

      if (result.queued) {
        setQueued(true);
        setTimeout(() => onOpenChange(false), 2200);
        return;
      }

      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        if (error.fieldErrors.acknowledgeConflict?.length) {
          setConflictMessage(error.messageAr);
          return;
        }
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setFormError('Could not save the hearing outcome. Try again.');
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Record hearing outcome"
        description={`${hearing.caseNumber} · ${formatLongDateAr(new Date(hearing.scheduledAt))}`}
      >
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">What happened?</legend>
            <div className="grid grid-cols-2 gap-2">
              {HEARING_OUTCOMES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setOutcome(option)}
                  aria-pressed={outcome === option}
                  className={cn(
                    'min-h-12 rounded-md border p-3 text-sm font-medium transition-colors',
                    outcome === option
                      ? 'border-brand bg-brand-subtle text-brand'
                      : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                  )}
                >
                  {HEARING_OUTCOME_AR[option]}
                </button>
              ))}
            </div>
          </fieldset>

          {outcome === 'ADJOURNED' ? (
            <Field label="Reason for adjournment" error={fieldErrors.adjournmentReason?.[0]}>
              {(props) => (
                <div className="space-y-2">
                  <Input
                    {...props}
                    value={adjournmentReason}
                    onChange={(event) => setAdjournmentReason(event.target.value)}
                    placeholder="Example: To notify the opposing party"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_ADJOURNMENT_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setAdjournmentReason(reason)}
                        className="min-h-9 rounded-full border border-line-strong px-3 py-1 text-xs text-ink-muted hover:bg-surface-sunken"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>
          ) : null}

          {outcome === 'ADJOURNED' ? (
            <div className="rounded-md bg-brand-subtle px-3 py-2 text-sm text-brand">
              When adjourning, set the next hearing date. Leave the time blank if the court has not
              set it.
            </div>
          ) : (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-surface-sunken p-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(event) => setScheduleNext(event.target.checked)}
                className="size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
              />
              Also schedule the next hearing
            </label>
          )}

          {scheduleNext ? (
            <div className="space-y-3 border-s-2 border-brand/30 ps-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Hearing date" required error={fieldErrors.nextDate?.[0]}>
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={nextDate}
                      onChange={(event) => {
                        setNextDate(event.target.value);
                        resetConflict();
                      }}
                    />
                  )}
                </Field>
                <Field label="Time" hint="Optional. Leave blank if not yet set.">
                  {(props) => (
                    <Input
                      {...props}
                      type="time"
                      value={nextTime}
                      onChange={(event) => {
                        setNextTime(event.target.value);
                        resetConflict();
                      }}
                    />
                  )}
                </Field>
              </div>
              <p className="text-xs text-ink-subtle">
                Standard hearing reminders are applied automatically; you do not need to set them
                for each hearing.
              </p>
            </div>
          ) : null}

          {canAdvanceCase ? (
            <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-line p-3 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={advanceStatus}
                onChange={(event) => setAdvanceStatus(event.target.checked)}
                className="mt-0.5 size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
              />
              <span>
                {outcome === 'ADJOURNED'
                  ? 'Move the case from notification to hearing'
                  : 'Move the case to judgment reserved'}
                <span className="block text-xs text-ink-subtle">
                  Both changes are saved together with the hearing outcome. If an error occurs,
                  neither is saved.
                </span>
              </span>
            </label>
          ) : null}

          {outcome === 'RESERVED_FOR_JUDGMENT' && canAdvanceCase && advanceStatus ? (
            <Field
              label="Expected judgment date"
              required
              error={fieldErrors.expectedJudgmentDate?.[0]}
              hint="Appears in the calendar with an automatic reminder."
            >
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={expectedJudgmentDate}
                  onChange={(event) => setExpectedJudgmentDate(event.target.value)}
                />
              )}
            </Field>
          ) : null}

          <Field label="Notes">
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional"
              />
            )}
          </Field>

          {conflictMessage ? (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning-subtle p-3">
              <p className="flex items-start gap-2 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{conflictMessage}</span>
              </p>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={acknowledgeConflict}
                  onChange={(event) => setAcknowledgeConflict(event.target.checked)}
                  className="size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
                />
                I have reviewed the conflict and want to continue
              </label>
            </div>
          ) : null}

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          {queued ? (
            <p
              role="status"
              className="flex items-start gap-2 rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning"
            >
              <CloudOff className="mt-0.5 size-4 shrink-0" />
              <span>
                You are offline. The outcome was saved on this device and will be sent when you
                reconnect.
              </span>
            </p>
          ) : null}

          <SheetFooter>
            <Button variant="secondary" block onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              block
              loading={record.isPending}
              disabled={Boolean(conflictMessage && !acknowledgeConflict)}
              onClick={() => void submit()}
            >
              Save outcome
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const COMMON_ADJOURNMENT_REASONS = [
  'To notify the opposing party',
  'For the expert to attend',
  'To submit documents',
  'To hear witnesses',
  'At both parties’ request',
  'Judge absent',
];
