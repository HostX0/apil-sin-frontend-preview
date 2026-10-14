'use client';

import { AlertTriangle, ArrowLeft, FileText } from 'lucide-react';
import { uiEnglish } from '@/lib/ui-english';
import { useEffect, useMemo, useState } from 'react';
import {
  CASE_STATUS_AR,
  TRANSITION_WARNING_AR,
  toBaghdadDateKey,
  type AvailableTransition,
  type CaseDetail,
  type ChangeCaseStatusInput,
  type DocumentListItem,
  type TransitionRequirement,
} from '@/lib/ui-shared';
import {
  Button,
  Field,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  Skeleton,
  Textarea,
  cn,
} from '@muhami/ui';
import { CaseStatusBadge } from '@/components/cases/case-status-badge';
import { ApiError } from '@/lib/api-client';
import { useCaseTransitions, useChangeCaseStatus } from '@/lib/api/cases';
import { useDocumentList } from '@/lib/api/documents';
import { useAuth } from '@/lib/auth-context';

/**
 * Status change — two steps: pick the destination, then supply exactly what that
 * legal transition requires. Warnings are explicitly acknowledged rather than
 * silently sending `acknowledgeWarnings=true` behind the user's back.
 */
export function StatusChangeSheet({
  open,
  onOpenChange,
  legalCase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  legalCase: CaseDetail;
}) {
  const [selected, setSelected] = useState<AvailableTransition | null>(null);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<Partial<ChangeCaseStatusInput>>({});

  const { can } = useAuth();
  const canReadDocuments = can('document:read');
  const { data: transitions, isLoading } = useCaseTransitions(legalCase.id, open);
  const change = useChangeCaseStatus(legalCase.id);

  const needsSupportingDocument = Boolean(
    selected?.requires.some(
      (requirement) => requirement === 'JUDGMENT_RECORD' || requirement === 'DECISION_RECORD',
    ),
  );
  const documents = useDocumentList(
    { caseId: legalCase.id, sort: 'recent', limit: 50 },
    { enabled: open && needsSupportingDocument && canReadDocuments },
  );
  const caseDocuments = useMemo(
    () => documents.data?.pages.flatMap((page) => page.items) ?? [],
    [documents.data],
  );

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setWarningsAcknowledged(false);
      setForm({});
      setFormError(null);
      setFieldErrors({});
    }
  }, [open]);

  const selectTransition = (transition: AvailableTransition) => {
    setSelected(transition);
    setWarningsAcknowledged(false);
    setForm({});
    setFieldErrors({});
    setFormError(null);
  };

  const setField = (key: keyof ChangeCaseStatusInput, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const submit = async () => {
    if (!selected) return;
    if (selected.warnings.length > 0 && !warningsAcknowledged) return;
    if (needsSupportingDocument && !canReadDocuments) return;
    setFormError(null);

    try {
      await change.mutateAsync({
        toStatus: selected.to,
        effectiveAt: form.effectiveAt ?? toBaghdadDateKey(new Date()),
        reason: form.reason,
        nextHearingDate: form.nextHearingDate,
        expectedJudgmentDate: form.expectedJudgmentDate,
        // Kept on the wire for compatibility; the shipped state machine now
        // treats effectiveAt as the single persisted legal date.
        judgmentDate: form.judgmentDate,
        decisionDate: form.decisionDate,
        appellateDecisionDate: form.appellateDecisionDate,
        documentId: form.documentId,
        acknowledgeWarnings: selected.warnings.length > 0 ? warningsAcknowledged : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setFormError('Could not change the status. Try again.');
      }
    }
  };

  const submitBlocked =
    change.isPending ||
    (selected?.warnings.length ? !warningsAcknowledged : false) ||
    (needsSupportingDocument && !canReadDocuments);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Change case status"
        description={`Current status: ${CASE_STATUS_AR[legalCase.status]}`}
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : !selected ? (
          <TransitionPicker
            transitions={transitions ?? []}
            currentStatus={legalCase.status}
            onSelect={selectTransition}
          />
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setWarningsAcknowledged(false);
                setForm({});
              }}
              className="flex min-h-10 items-center gap-1.5 text-sm font-medium text-brand"
            >
              <ArrowLeft className="size-4" />
              Choose another status
            </button>

            <div className="flex items-center gap-2 rounded-md bg-surface-sunken p-3">
              <CaseStatusBadge status={legalCase.status} />
              <ArrowLeft className="size-4 rotate-180 text-ink-subtle" aria-hidden />
              <CaseStatusBadge status={selected.to} />
            </div>

            <p className="text-sm text-ink-muted">{uiEnglish(selected.triggerAr)}</p>

            {selected.warnings.length > 0 ? (
              <div className="space-y-3 rounded-md border border-warning/40 bg-warning-subtle p-3">
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                    <AlertTriangle className="size-4" aria-hidden />
                    Alerts before continuing
                  </p>
                  <ul className="space-y-0.5 ps-5">
                    {selected.warnings.map((warning) => (
                      <li key={warning} className="list-disc text-sm text-ink-muted">
                        {TRANSITION_WARNING_AR[warning]}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-ink-subtle">
                    These alerts do not block the action, but may need follow-up after changing the
                    status.
                  </p>
                </div>

                <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md bg-surface/70 p-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={warningsAcknowledged}
                    onChange={(event) => setWarningsAcknowledged(event.target.checked)}
                    className="mt-0.5 size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
                  />
                  <span>I have reviewed the alerts and want to change the status.</span>
                </label>
              </div>
            ) : null}

            <RequirementFields
              requires={selected.requires}
              values={form}
              errors={fieldErrors}
              onChange={setField}
              documents={caseDocuments}
              documentsLoading={documents.isLoading}
              canReadDocuments={canReadDocuments}
              hasMoreDocuments={Boolean(documents.hasNextPage)}
              loadMoreDocuments={() => void documents.fetchNextPage()}
            />

            {formError ? (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}

            <SheetFooter>
              <Button variant="secondary" block onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                block
                loading={change.isPending}
                disabled={submitBlocked}
                onClick={() => void submit()}
              >
                Confirm change
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TransitionPicker({
  transitions,
  currentStatus,
  onSelect,
}: {
  transitions: AvailableTransition[];
  currentStatus: CaseDetail['status'];
  onSelect: (transition: AvailableTransition) => void;
}) {
  if (transitions.length === 0) {
    return (
      <p className="rounded-md bg-surface-sunken px-3 py-4 text-center text-sm text-ink-muted">
        No transitions are available from “{CASE_STATUS_AR[currentStatus]}” with your current
        permissions.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {transitions.map((transition) => (
        <li key={transition.to}>
          <button
            type="button"
            onClick={() => onSelect(transition)}
            className="flex min-h-14 w-full items-start gap-3 rounded-md border border-line-strong bg-surface p-3 text-start transition-colors hover:border-brand/50 hover:bg-brand-subtle/40"
          >
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block text-sm font-semibold text-ink">
                {CASE_STATUS_AR[transition.to]}
              </span>
              <span className="block text-xs text-ink-muted">
                {uiEnglish(transition.triggerAr)}
              </span>
            </span>
            {transition.warnings.length > 0 ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function RequirementFields({
  requires,
  values,
  errors,
  onChange,
  documents,
  documentsLoading,
  canReadDocuments,
  hasMoreDocuments,
  loadMoreDocuments,
}: {
  requires: TransitionRequirement[];
  values: Partial<ChangeCaseStatusInput>;
  errors: Record<string, string[]>;
  onChange: (key: keyof ChangeCaseStatusInput, value: string) => void;
  documents: DocumentListItem[];
  documentsLoading: boolean;
  canReadDocuments: boolean;
  hasMoreDocuments: boolean;
  loadMoreDocuments: () => void;
}) {
  const needs = new Set(requires);
  const today = toBaghdadDateKey(new Date());
  const needsSupportingDocument = needs.has('JUDGMENT_RECORD') || needs.has('DECISION_RECORD');

  return (
    <div className="space-y-4">
      <Field label="Effective date" required error={errors.effectiveAt?.[0]}>
        {(props) => (
          <Input
            {...props}
            type="date"
            value={(values.effectiveAt as string) ?? today}
            onChange={(event) => onChange('effectiveAt', event.target.value)}
            className={cn(errors.effectiveAt && 'border-danger')}
          />
        )}
      </Field>

      {needs.has('NEXT_HEARING_DATE') ? (
        <Field
          label="Next hearing date"
          required
          error={errors.nextHearingDate?.[0]}
          hint="A hearing will be created for this date without assuming an unknown time."
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              value={(values.nextHearingDate as string) ?? ''}
              onChange={(event) => onChange('nextHearingDate', event.target.value)}
            />
          )}
        </Field>
      ) : null}

      {needs.has('EXPECTED_JUDGMENT_DATE') ? (
        <Field
          label="Expected judgment date"
          required
          error={errors.expectedJudgmentDate?.[0]}
          hint="Appears in the calendar with an automatic reminder."
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              value={(values.expectedJudgmentDate as string) ?? ''}
              onChange={(event) => onChange('expectedJudgmentDate', event.target.value)}
            />
          )}
        </Field>
      ) : null}

      {/* Legacy requirement kinds remain in the shared wire contract for older
          servers, but the current machine uses effectiveAt as the sole legal
          date. These controls render only if such a requirement is actually
          returned by the API. */}
      {needs.has('JUDGMENT_DATE') ? (
        <Field label="Judgment date" required error={errors.judgmentDate?.[0]}>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={(values.judgmentDate as string) ?? ''}
              onChange={(event) => onChange('judgmentDate', event.target.value)}
            />
          )}
        </Field>
      ) : null}

      {needs.has('DECISION_DATE') ? (
        <Field label="Decision date" required error={errors.decisionDate?.[0]}>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={(values.decisionDate as string) ?? ''}
              onChange={(event) => onChange('decisionDate', event.target.value)}
            />
          )}
        </Field>
      ) : null}

      {needs.has('APPELLATE_DECISION_DATE') ? (
        <Field label="Appeal decision date" required error={errors.appellateDecisionDate?.[0]}>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={(values.appellateDecisionDate as string) ?? ''}
              onChange={(event) => onChange('appellateDecisionDate', event.target.value)}
            />
          )}
        </Field>
      ) : null}

      {needsSupportingDocument ? (
        canReadDocuments ? (
          <div className="space-y-2">
            <Field
              label={needs.has('JUDGMENT_RECORD') ? 'Judgment document' : 'Decision document'}
              required
              error={errors.documentId?.[0]}
              hint="You can choose a document saved in this case only."
            >
              {(props) => (
                <select
                  {...props}
                  value={(values.documentId as string) ?? ''}
                  onChange={(event) => onChange('documentId', event.target.value)}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
                >
                  <option value="">Choose a document…</option>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title} — {document.fileName}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {documentsLoading ? (
              <p className="text-xs text-ink-subtle">Loading case documents…</p>
            ) : documents.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md bg-info-subtle px-3 py-2 text-sm text-info">
                <FileText className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  No document is saved for this case. Upload it in Documents, then reopen Change
                  status.
                </p>
              </div>
            ) : null}

            {hasMoreDocuments ? (
              <Button type="button" variant="ghost" size="sm" onClick={loadMoreDocuments}>
                Load more documents
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              This transition requires a supporting document, but your current role cannot read case
              documents. Request this permission before proceeding.
            </p>
          </div>
        )
      ) : null}

      <Field label="Reason / notes" required={needs.has('REASON')} error={errors.reason?.[0]}>
        {(props) => (
          <Textarea
            {...props}
            rows={3}
            value={(values.reason as string) ?? ''}
            onChange={(event) => onChange('reason', event.target.value)}
            placeholder={needs.has('REASON') ? 'Required for this transition' : 'Optional'}
          />
        )}
      </Field>
    </div>
  );
}
