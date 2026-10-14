'use client';

import { FileText, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { POA_TYPE_AR, type CaseDetail, type PoaSummary } from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useAddPoa, useDeletePoa, useUpdatePoa } from '@/lib/api/cases';
import { useDocumentList } from '@/lib/api/documents';
import { useAuth } from '@/lib/auth-context';

/**
 * Add/correct a power of attorney without leaving the case file.
 *
 * Newer API responses expose the full optional record. Older cached responses
 * may not contain certificationDate/scope/notes/documentId, so edit PATCHes only
 * send those fields after the user actually touches them. That prevents opening
 * an old record and accidentally erasing evidence the browser never received.
 */
export function PoaFormSheet({
  open,
  onOpenChange,
  legalCase,
  poa = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  legalCase: CaseDetail;
  poa?: PoaSummary | null;
}) {
  const editing = Boolean(poa);
  const { can } = useAuth();
  const canReadDocuments = can('document:read');

  const documentsQuery = useDocumentList(
    { caseId: legalCase.id, sort: 'recent', limit: 100 },
    { enabled: open && canReadDocuments },
  );
  const documents = useMemo(
    () => documentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [documentsQuery.data],
  );

  const add = useAddPoa(legalCase.id);
  const update = useUpdatePoa(legalCase.id, poa?.id ?? '');
  const remove = useDeletePoa(legalCase.id, poa?.id ?? '');

  const [number, setNumber] = useState('');
  const [type, setType] = useState<'GENERAL' | 'SPECIFIC'>('SPECIFIC');
  const [issueDate, setIssueDate] = useState('');
  const [issuer, setIssuer] = useState('');
  const [certified, setCertified] = useState(true);
  const [certificationDate, setCertificationDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [scope, setScope] = useState('');
  const [notes, setNotes] = useState('');
  const [documentId, setDocumentId] = useState('');

  const [certificationDateTouched, setCertificationDateTouched] = useState(false);
  const [scopeTouched, setScopeTouched] = useState(false);
  const [notesTouched, setNotesTouched] = useState(false);
  const [documentTouched, setDocumentTouched] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setNumber(poa?.number ?? '');
    setType(poa?.type ?? 'SPECIFIC');
    setIssueDate(dateInputValue(poa?.issueDate));
    setIssuer(poa?.issuer ?? '');
    setCertified(poa?.certified ?? true);
    setCertificationDate(dateInputValue(poa?.certificationDate));
    setExpiresAt(dateInputValue(poa?.expiresAt));
    setScope(poa?.scope ?? '');
    setNotes(poa?.notes ?? '');
    setDocumentId(poa?.documentId ?? '');

    setCertificationDateTouched(false);
    setScopeTouched(false);
    setNotesTouched(false);
    setDocumentTouched(false);
    setDeleteArmed(false);
    setFieldErrors({});
    setFormError(null);
  }, [open, poa]);

  const busy = add.isPending || update.isPending || remove.isPending;

  const submit = async () => {
    if (busy) return;
    setFieldErrors({});
    setFormError(null);

    try {
      if (editing && poa) {
        await update.mutateAsync({
          number,
          type,
          issueDate,
          issuer: issuer.trim() || null,
          certified,
          expiresAt: expiresAt || null,
          ...(poa.certificationDate !== undefined || certificationDateTouched
            ? { certificationDate: certified && certificationDate ? certificationDate : null }
            : {}),
          ...(poa.scope !== undefined || scopeTouched ? { scope: scope.trim() || null } : {}),
          ...(poa.notes !== undefined || notesTouched ? { notes: notes.trim() || null } : {}),
          ...(poa.documentId !== undefined || documentTouched
            ? { documentId: documentId || null }
            : {}),
        });
      } else {
        await add.mutateAsync({
          number,
          type,
          issueDate,
          issuer: issuer.trim() || undefined,
          certified,
          certificationDate: certified && certificationDate ? certificationDate : undefined,
          expiresAt: expiresAt || undefined,
          scope: scope.trim() || undefined,
          notes: notes.trim() || undefined,
          documentId: documentId || undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setFormError(
          editing
            ? 'Could not save the power of attorney changes.'
            : 'Could not register the power of attorney.',
        );
      }
    }
  };

  const deletePoa = async () => {
    if (!poa || !deleteArmed) {
      setDeleteArmed(true);
      return;
    }

    setFormError(null);
    try {
      await remove.mutateAsync();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) setFormError(error.messageAr);
      else setFormError('Could not delete the power of attorney.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={editing ? 'Edit power of attorney' : 'Register power of attorney'}
        description={`${legalCase.numberDisplay} · ${legalCase.clientName}`}
      >
        <div className="space-y-4 pb-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Power of attorney number" required error={fieldErrors.number?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  className="ltr-numerals"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  placeholder="Example: 123/2026"
                />
              )}
            </Field>

            <Field label="Power of attorney type" required error={fieldErrors.type?.[0]}>
              {(props) => (
                <select
                  {...props}
                  value={type}
                  onChange={(event) => setType(event.target.value as 'GENERAL' | 'SPECIFIC')}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
                >
                  <option value="GENERAL">{POA_TYPE_AR.GENERAL}</option>
                  <option value="SPECIFIC">{POA_TYPE_AR.SPECIFIC}</option>
                </select>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Issue date" required error={fieldErrors.issueDate?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                />
              )}
            </Field>

            <Field label="Issuing authority" error={fieldErrors.issuer?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  value={issuer}
                  onChange={(event) => setIssuer(event.target.value)}
                  placeholder="Notary or issuing authority"
                />
              )}
            </Field>
          </div>

          <div className="rounded-lg border border-line bg-surface-sunken p-3">
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={certified}
                onChange={(event) => {
                  setCertified(event.target.checked);
                  setCertificationDateTouched(true);
                  if (!event.target.checked) setCertificationDate('');
                }}
                className="mt-1 size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  Power of attorney is certified
                </span>
                <span className="block text-xs text-ink-subtle">
                  Enable this option when the power of attorney is certified.
                </span>
              </span>
            </label>

            {certified ? (
              <Field
                className="mt-3"
                label="Certification date"
                error={fieldErrors.certificationDate?.[0]}
                hint="Optional if the date is not currently recorded."
              >
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    value={certificationDate}
                    onChange={(event) => {
                      setCertificationDate(event.target.value);
                      setCertificationDateTouched(true);
                    }}
                  />
                )}
              </Field>
            ) : null}
          </div>

          <Field
            label="Expiry date"
            error={fieldErrors.expiresAt?.[0]}
            hint="Leave blank if no expiry date is recorded for the power of attorney."
          >
            {(props) => (
              <Input
                {...props}
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            )}
          </Field>

          <Field label="Scope of power of attorney" error={fieldErrors.scope?.[0]}>
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value);
                  setScopeTouched(true);
                }}
                placeholder="Powers or scope recorded in the power of attorney"
              />
            )}
          </Field>

          {canReadDocuments ? (
            <Field
              label="Supporting document"
              error={fieldErrors.documentId?.[0]}
              hint="Choose the power of attorney from this case’s documents. If it is not saved yet, you can add it later."
            >
              {(props) => (
                <div className="relative">
                  <FileText
                    className="pointer-events-none absolute start-3 top-3.5 size-4 text-ink-subtle"
                    aria-hidden
                  />
                  <select
                    {...props}
                    value={documentId}
                    onChange={(event) => {
                      setDocumentId(event.target.value);
                      setDocumentTouched(true);
                    }}
                    disabled={documentsQuery.isLoading || documentsQuery.isError}
                    className="h-11 w-full rounded-md border border-line-strong bg-surface ps-9 pe-3 text-base text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 disabled:bg-surface-sunken"
                  >
                    <option value="">
                      {documentsQuery.isLoading ? 'Loading documents…' : 'No linked document'}
                    </option>
                    {documentId && !documents.some((document) => document.id === documentId) ? (
                      <option value={documentId}>Currently linked document</option>
                    ) : null}
                    {documents.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title} — {document.fileName}
                      </option>
                    ))}
                  </select>
                  {documentsQuery.isError ? (
                    <p role="alert" className="mt-2 text-sm text-danger">
                      Could not load documents.{' '}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void documentsQuery.refetch()}
                      >
                        Try again
                      </button>
                    </p>
                  ) : null}
                  {documentsQuery.hasNextPage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={documentsQuery.isFetchingNextPage}
                      onClick={() => void documentsQuery.fetchNextPage()}
                    >
                      Show more documents
                    </Button>
                  ) : null}
                </div>
              )}
            </Field>
          ) : (
            <p className="rounded-md bg-surface-sunken px-3 py-2 text-xs text-ink-subtle">
              The office administrator can link a power of attorney from the case documents.
            </p>
          )}

          <Field label="Notes" error={fieldErrors.notes?.[0]}>
            {(props) => (
              <Textarea
                {...props}
                rows={3}
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setNotesTouched(true);
                }}
                placeholder="Notes about the power of attorney"
              />
            )}
          </Field>

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          {editing && poa && can('poa:delete') ? (
            <div className="rounded-lg border border-danger/30 bg-danger-subtle/40 p-3">
              <p className="mb-2 text-xs leading-relaxed text-ink-muted">
                The power of attorney will be removed from the case file. Its document will remain
                in the case documents.
              </p>
              <Button
                variant="danger"
                size="sm"
                loading={remove.isPending}
                disabled={busy && !remove.isPending}
                onClick={() => void deletePoa()}
              >
                <Trash2 className="size-4" />
                {deleteArmed ? 'Confirm deletion of power of attorney' : 'Delete power of attorney'}
              </Button>
              {deleteArmed ? (
                <button
                  type="button"
                  className="ms-3 min-h-10 text-xs font-medium text-ink-muted hover:text-ink"
                  onClick={() => setDeleteArmed(false)}
                >
                  Undo
                </button>
              ) : null}
            </div>
          ) : null}

          <SheetFooter>
            <Button variant="secondary" block disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              block
              loading={add.isPending || update.isPending}
              disabled={remove.isPending}
              onClick={() => void submit()}
            >
              {editing ? 'Save changes' : 'Register power of attorney'}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function dateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
