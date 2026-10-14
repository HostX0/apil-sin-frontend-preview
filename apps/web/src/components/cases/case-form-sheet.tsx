'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  CASE_TYPES,
  CASE_TYPE_AR,
  CASE_TYPE_CODES,
  PARTY_ROLES,
  PARTY_ROLE_AR,
  PRIORITIES,
  PRIORITY_AR,
  createCaseSchema,
  updateCaseSchema,
  toBaghdadDateKey,
  type CaseDetail,
  type CreateCaseInput,
  type UpdateCaseInput,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useCreateCase, useUpdateCase } from '@/lib/api/cases';
import { useClient, useClientList } from '@/lib/api/clients';
import { ClientFormSheet } from '@/components/clients/client-form-sheet';
import { useAuth } from '@/lib/auth-context';
import { useDebounced } from '@/lib/use-debounced';
import { CourtPicker } from './court-picker';
import { LawyerPicker } from './lawyer-picker';

/**
 * Create / edit case.
 *
 * The case number is entered as its three parts because that is how Iraqi courts
 * issue it — a single free-text box would be faster to build and would destroy
 * search, sorting and duplicate detection.
 */
export function CaseFormSheet({
  open,
  onOpenChange,
  legalCase,
  defaultClientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  legalCase?: CaseDetail;
  defaultClientId?: string;
  onSaved?: (saved: CaseDetail) => void;
}) {
  const isEdit = Boolean(legalCase);
  const { can } = useAuth();
  const [addingClient, setAddingClient] = useState(false);
  const [showMore, setShowMore] = useState(
    Boolean(
      legalCase?.parties.some((party) => party.side === 'OPPONENT') ||
      legalCase?.claimValue ||
      (legalCase?.priority !== undefined && legalCase.priority !== 'NORMAL'),
    ),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  const createMutation = useCreateCase();
  const updateMutation = useUpdateCase(legalCase?.id ?? '');

  const debouncedClientSearch = useDebounced(clientSearch);
  const clients = useClientList({ search: debouncedClientSearch || undefined, sort: 'name' }, open);
  const clientOptions = clients.data?.pages.flatMap((page) => page.items) ?? [];

  const form = useForm<CreateCaseInput>({
    // The record version is appended from legalCase when saving an edit; it is
    // not an editable field and must not make the form resolver fail silently.
    resolver: zodResolver(isEdit ? updateCaseSchema.omit({ version: true }) : createCaseSchema),
    defaultValues: {
      serial: legalCase?.serial ?? ('' as unknown as number),
      typeCode: legalCase?.typeCode ?? 'ب',
      year: legalCase?.year ?? new Date().getFullYear(),
      courtId: legalCase?.courtId ?? '',
      caseType: legalCase?.caseType ?? 'CIVIL',
      clientId: legalCase?.clientId ?? defaultClientId ?? '',
      clientRole: legalCase?.clientRole ?? 'PLAINTIFF',
      subject: legalCase?.subject ?? '',
      openedAt: legalCase?.openedAt.slice(0, 10) ?? toBaghdadDateKey(new Date()),
      claimValue: legalCase?.claimValue ?? undefined,
      judgeName: legalCase?.judgeName ?? undefined,
      chamber: legalCase?.chamber ?? undefined,
      priority: legalCase?.priority ?? 'NORMAL',
      opponents:
        legalCase?.parties
          .filter((party) => party.side === 'OPPONENT')
          .map((party) => ({
            name: party.name,
            role: party.role,
            counselName: party.counselName ?? undefined,
            address: party.address ?? undefined,
            phone: party.phone ?? undefined,
          })) ?? [],
      assignedLawyerIds: legalCase?.assignedLawyers.map((lawyer) => lawyer.id) ?? [],
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const opponents = useFieldArray({ control, name: 'opponents' });
  const caseType = watch('caseType');
  const clientId = watch('clientId');
  const courtId = watch('courtId');
  const priority = watch('priority');
  const assignedLawyerIds = watch('assignedLawyerIds');
  const selectedClient = useClient(open && clientId ? clientId : '');

  useEffect(() => {
    if (!open) {
      reset();
      setFormError(null);
      setClientSearch('');
      setAddingClient(false);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        const saved = isEdit
          ? await updateMutation.mutateAsync({
              ...values,
              version: legalCase!.version,
            } as UpdateCaseInput)
          : await createMutation.mutateAsync(values);
        onSaved?.(saved);
        onOpenChange(false);
      } catch (error) {
        if (error instanceof ApiError) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            form.setError(field as keyof CreateCaseInput, { message: messages[0] });
          }
          if (
            Object.keys(error.fieldErrors).some((field) => field.startsWith('opponents')) ||
            error.fieldErrors.claimValue ||
            error.fieldErrors.priority
          )
            setShowMore(true);
          if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
        } else {
          setFormError('Could not save. Try again.');
        }
      }
    },
    (invalid) => {
      if (invalid.opponents || invalid.claimValue || invalid.priority) setShowMore(true);
      setFormError('Complete the fields marked in red, then save the case.');
    },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={isEdit ? 'Edit case' : 'New case'}
        description="Enter the case details and choose a client and lawyer. You can add further details later."
      >
        <form onSubmit={onSubmit} className="min-w-0 space-y-4" noValidate>
          <fieldset disabled={isSubmitting} className="min-w-0 space-y-4">
            {/* ── Case number: three parts, never one free-text box ─────────── */}
            <fieldset className="min-w-0 space-y-1.5">
              <legend className="mb-1.5 text-sm font-medium text-ink">
                Case number <span className="text-danger">*</span>
              </legend>
              <div
                className="flex items-center gap-2"
                dir="ltr"
                aria-describedby="case-number-help"
              >
                <Input
                  {...register('serial')}
                  inputMode="numeric"
                  placeholder="1234"
                  aria-label="Case number"
                  className="min-w-0 flex-1 text-center"
                  dir="ltr"
                />
                <span className="text-ink-subtle">/</span>
                <select
                  {...register('typeCode')}
                  aria-label="Case type code"
                  className="h-11 w-24 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink"
                >
                  {CASE_TYPE_CODES.map((code) => (
                    <option key={code.code} value={code.code}>
                      {code.code} — {code.ar}
                    </option>
                  ))}
                </select>
                <span className="text-ink-subtle">/</span>
                <Input
                  {...register('year')}
                  inputMode="numeric"
                  placeholder="Year"
                  aria-label="Year"
                  className="w-24 text-center"
                  dir="ltr"
                />
              </div>
              <p id="case-number-help" className="text-xs text-ink-subtle">
                Enter the number, code and year as shown on the court document. Example:{' '}
                <bdi dir="ltr">
                  1234 / <bdi dir="auto">{CASE_TYPE_CODES[0]?.code}</bdi> /{' '}
                  {new Date().getFullYear()}
                </bdi>
              </p>
              {errors.serial?.message || errors.year?.message ? (
                <p role="alert" className="text-sm text-danger">
                  {errors.serial?.message ?? errors.year?.message}
                </p>
              ) : null}
            </fieldset>

            {/* ── Court: searchable and governorate-aware ──────────────────── */}
            <Field label="Court" required error={errors.courtId?.message}>
              {(props) => (
                <>
                  <input type="hidden" {...register('courtId')} />
                  <CourtPicker
                    id={props.id}
                    value={courtId}
                    onChange={(value) =>
                      setValue('courtId', value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    describedBy={props['aria-describedby']}
                    invalid={Boolean(errors.courtId)}
                  />
                </>
              )}
            </Field>

            {/* ── Type ──────────────────────────────────────────────────────── */}
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">
                Case type <span className="text-danger">*</span>
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {CASE_TYPES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setValue('caseType', option, { shouldDirty: true })}
                    aria-pressed={caseType === option}
                    className={cn(
                      'min-h-11 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      caseType === option
                        ? 'border-brand bg-brand-subtle text-brand'
                        : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                    )}
                  >
                    {CASE_TYPE_AR[option]}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* ── Client ────────────────────────────────────────────────────── */}
            <Field label="Client" required error={errors.clientId?.message}>
              {(props) => (
                <div className="space-y-2">
                  <Input
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    placeholder="Search for a client by name or number"
                    aria-label="Search for a client"
                  />
                  <select
                    {...props}
                    {...register('clientId')}
                    value={clientId}
                    disabled={clients.isLoading}
                    className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
                  >
                    <option value="">
                      {clients.isLoading ? 'Loading clients…' : 'Choose a client…'}
                    </option>
                    {clientId && !clientOptions.some((option) => option.id === clientId) ? (
                      <option value={clientId}>
                        {selectedClient.data?.fullName ??
                          legalCase?.clientName ??
                          'Selected client'}
                      </option>
                    ) : null}
                    {clientOptions.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName}
                      </option>
                    ))}
                  </select>
                  {clients.isError ? (
                    <p role="alert" className="text-sm text-danger">
                      Could not load clients.{' '}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void clients.refetch()}
                      >
                        Try again
                      </button>
                    </p>
                  ) : null}
                  {clients.isSuccess && clientOptions.length === 0 ? (
                    <p className="text-xs text-ink-subtle">
                      {clientSearch
                        ? 'No client matches this name or number. Try another search or add a client.'
                        : 'Add the client first; they will be selected for this case automatically.'}
                    </p>
                  ) : null}
                  {clients.hasNextPage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      loading={clients.isFetchingNextPage}
                      onClick={() => void clients.fetchNextPage()}
                    >
                      Show more clients
                    </Button>
                  ) : null}
                  {can('client:create') ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setAddingClient(true)}
                    >
                      <Plus className="size-4" aria-hidden />
                      Add a new client
                    </Button>
                  ) : null}
                </div>
              )}
            </Field>

            <Field label="Client’s role in the case" required error={errors.clientRole?.message}>
              {(props) => (
                <select
                  {...props}
                  {...register('clientRole')}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
                >
                  {PARTY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {PARTY_ROLE_AR[role]}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Case subject" required error={errors.subject?.message}>
              {(props) => (
                <Textarea
                  {...props}
                  {...register('subject')}
                  rows={2}
                  placeholder="Example: Claim for damages"
                />
              )}
            </Field>

            <LawyerPicker
              value={assignedLawyerIds}
              onChange={(value) =>
                setValue('assignedLawyerIds', value, { shouldDirty: true, shouldValidate: true })
              }
              existing={legalCase?.assignedLawyers}
              enabled={open}
              error={errors.assignedLawyerIds?.message}
            />

            <Field label="Registration date" required error={errors.openedAt?.message}>
              {(props) => <Input {...props} {...register('openedAt')} type="date" />}
            </Field>

            <button
              type="button"
              aria-expanded={showMore}
              onClick={() => setShowMore((current) => !current)}
              className="flex min-h-11 w-full items-center gap-2 text-sm font-medium text-brand"
            >
              <ChevronDown aria-hidden className={showMore ? 'size-4 rotate-180' : 'size-4'} />
              Opposing parties, claim amount and priority (optional)
            </button>
            {showMore ? (
              <div className="space-y-4 border-t border-line pt-4">
                {/* ── Opponents ─────────────────────────────────────────────────── */}
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-ink">Opposing parties</legend>

                  {opponents.fields.map((field, index) => (
                    <div key={field.id} className="space-y-2 rounded-md border border-line p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          {...register(`opponents.${index}.name`)}
                          placeholder="Opponent name"
                          aria-label={`Opposing party name ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => opponents.remove(index)}
                          aria-label="Remove opposing party"
                          className="tap-target flex shrink-0 items-center justify-center rounded-md text-ink-subtle hover:bg-danger-subtle hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <Input
                        {...register(`opponents.${index}.counselName`)}
                        placeholder="Opposing counsel (optional)"
                        aria-label="Opposing counsel"
                      />
                      {errors.opponents?.[index]?.name ? (
                        <p role="alert" className="text-sm text-danger">
                          {errors.opponents[index]?.name?.message}
                        </p>
                      ) : null}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      opponents.append({ name: '', role: 'DEFENDANT', counselName: undefined })
                    }
                  >
                    <Plus className="size-4" />
                    Add opposing party
                  </Button>
                </fieldset>

                {/* ── Dates and value ───────────────────────────────────────────── */}
                <Field
                  label="Claim amount (Iraqi dinars)"
                  hint="The amount claimed in the case. Office fees are recorded later in Finance."
                  error={errors.claimValue?.message}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register('claimValue')}
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="12000000"
                    />
                  )}
                </Field>

                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-ink">Priority</legend>
                  <div className="flex gap-2">
                    {PRIORITIES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setValue('priority', option, { shouldDirty: true })}
                        aria-pressed={priority === option}
                        className={cn(
                          'tap-target flex-1 rounded-md border px-3 text-sm font-medium transition-colors',
                          priority === option
                            ? 'border-brand bg-brand-subtle text-brand'
                            : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                        )}
                      >
                        {PRIORITY_AR[option]}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            ) : null}

            {formError ? (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}

            <SheetFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" block loading={isSubmitting}>
                {isEdit ? 'Save changes' : 'Register case'}
              </Button>
            </SheetFooter>
          </fieldset>
        </form>
      </SheetContent>
      <ClientFormSheet
        open={addingClient}
        onOpenChange={setAddingClient}
        onSaved={(client) => {
          setValue('clientId', client.id, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          setClientSearch('');
        }}
      />
    </Sheet>
  );
}
