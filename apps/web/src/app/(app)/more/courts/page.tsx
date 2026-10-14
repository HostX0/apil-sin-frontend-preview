'use client';

import { uiEnglish } from '@/lib/ui-english';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { Building2, MapPin, Pencil, Plus, RefreshCw, Search, Scale, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import {
  COURT_TYPES,
  COURT_TYPE_AR,
  IRAQ_GOVERNORATES,
  JURISDICTIONS,
  JURISDICTION_AR,
  createCourtSchema,
  updateCourtSchema,
  type CourtDetail,
  type CourtSummary,
  type CourtType,
  type CreateCourtInput,
  type UpdateCourtInput,
} from '@/lib/ui-shared';
import { Button, Card, EmptyState, ErrorState, Field, Input, Textarea } from '@muhami/ui';
import { SettingsSection, SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import {
  useArchiveCourt,
  useCourt,
  useCourts,
  useCreateCourt,
  useSeedCourts,
  useUpdateCourt,
} from '@/lib/api/cases';
import { useAuth } from '@/lib/auth-context';
import { useDebounced } from '@/lib/use-debounced';

export default function CourtsDirectoryPage() {
  const { can } = useAuth();
  const canRead = can('case:read.all') || can('case:read.own');
  const canCreate = can('case:create');
  const canUpdate = can('case:update');
  const canDelete = can('case:delete');

  const [search, setSearch] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [type, setType] = useState<CourtType | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const debouncedSearch = useDebounced(search);
  const effectiveSearch = debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined;

  const courts = useCourts({
    search: effectiveSearch,
    governorate: governorate || undefined,
    type: type || undefined,
  });
  const sync = useSeedCourts();

  return (
    <SettingsShell
      title="Court directory"
      subtitle="Choose a court from the directory or add any court or authority your office uses."
      actions={
        canCreate ? (
          <Button
            type="button"
            aria-label="Reload the standard courts into the directory"
            size="sm"
            variant="secondary"
            loading={sync.isPending}
            onClick={() => sync.mutate()}
          >
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline">Refresh standard courts</span>
          </Button>
        ) : null
      }
    >
      {!canRead ? (
        <Card className="p-6">
          <EmptyState
            title="You do not have permission to view courts"
            description="Court read permission is needed to open the court directory."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <SettingsSection
            title="Search and filters"
            description="Enter a court name or choose a governorate to find it quickly."
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <label htmlFor="court-directory-search" className="relative sm:col-span-1">
                <span className="sr-only">Search court names</span>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
                />
                <Input
                  id="court-directory-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Court name..."
                  className="ps-9"
                />
              </label>

              <label className="relative">
                <span className="sr-only">Governorate</span>
                <MapPin
                  aria-hidden
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
                />
                <select
                  value={governorate}
                  onChange={(event) => setGovernorate(event.target.value)}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface pe-3 ps-9 text-sm text-ink"
                >
                  <option value="">All governorates</option>
                  {IRAQ_GOVERNORATES.map((item) => (
                    <option key={item} value={item}>
                      {uiEnglish(item, item)}
                    </option>
                  ))}
                </select>
              </label>

              <select
                value={type}
                onChange={(event) => setType(event.target.value as CourtType | '')}
                aria-label="Court type"
                className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
              >
                <option value="">All types</option>
                {COURT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {COURT_TYPE_AR[item]}
                  </option>
                ))}
              </select>
            </div>
            {search.trim().length === 1 ? (
              <p className="text-xs text-ink-subtle">
                Enter at least two characters to search by name.
              </p>
            ) : null}
          </SettingsSection>

          {canCreate ? <CreateCourtForm /> : null}
          {sync.isError ? (
            <p role="alert" className="text-sm text-danger">
              {sync.error instanceof ApiError
                ? sync.error.messageAr
                : 'Could not refresh the court directory. Please try again.'}
            </p>
          ) : null}
          {sync.isSuccess ? (
            <p role="status" className="text-xs text-success">
              Standard courts refreshed in the directory.
            </p>
          ) : null}
          {editingId ? <EditCourtForm id={editingId} onClose={() => setEditingId(null)} /> : null}

          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Registered courts
              </h2>
              <span className="ltr-numerals text-xs text-ink-subtle">
                {courts.data?.length ?? 0}
              </span>
            </div>

            {courts.isLoading ? (
              <Card className="p-5 text-sm text-ink-muted">Loading court directory...</Card>
            ) : courts.isError ? (
              <ErrorState
                description={courts.error instanceof ApiError ? courts.error.messageAr : undefined}
                onRetry={() => void courts.refetch()}
              />
            ) : courts.data && courts.data.length > 0 ? (
              <div className="grid gap-2 lg:grid-cols-2">
                {courts.data.map((court) => (
                  <CourtCard
                    key={court.id}
                    court={court}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={() => setEditingId(court.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-6">
                <EmptyState
                  icon={Building2}
                  title="No matching courts"
                  description={
                    effectiveSearch || governorate || type
                      ? 'Change the search or add the required court or authority.'
                      : 'Add the required court or choose Refresh standard courts to fill the directory.'
                  }
                  action={
                    effectiveSearch || governorate || type ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearch('');
                          setGovernorate('');
                          setType('');
                        }}
                      >
                        Clear search options
                      </Button>
                    ) : undefined
                  }
                />
              </Card>
            )}
          </section>
        </div>
      )}
    </SettingsShell>
  );
}

function CourtCard({
  court,
  canUpdate,
  canDelete,
  onEdit,
}: {
  court: CourtSummary;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
}) {
  const archive = useArchiveCourt(court.id);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const remove = async () => {
    if (court.caseCount > 0) return;
    if (!window.confirm(`Delete "${court.name}" from the office directory?`)) return;

    setArchiveError(null);
    try {
      await archive.mutateAsync();
    } catch (error) {
      setArchiveError(error instanceof ApiError ? error.messageAr : 'Could not delete the court.');
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
          <Scale className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-6 text-ink">{court.name}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-subtle">
            <span>{COURT_TYPE_AR[court.type]}</span>
            <span>{JURISDICTION_AR[court.jurisdiction]}</span>
            {court.governorate ? (
              <span>{uiEnglish(court.governorate, court.governorate)}</span>
            ) : null}
            {court.appealRegion ? <span>Appeal: {court.appealRegion}</span> : null}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {court.caseCount > 0
              ? `Linked to ${court.caseCount} cases. Its details can be edited, but it cannot be deleted.`
              : 'No cases are linked to this court.'}
          </p>

          {canUpdate || (canDelete && court.caseCount === 0) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {canUpdate ? (
                <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              ) : null}
              {canDelete && court.caseCount === 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={archive.isPending}
                  onClick={() => void remove()}
                >
                  <Trash2 className="size-4 text-danger" />
                  Delete from directory
                </Button>
              ) : null}
            </div>
          ) : null}

          {archiveError ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {archiveError}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function CreateCourtForm() {
  const create = useCreateCourt();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCourtInput>({
    resolver: zodResolver(createCourtSchema),
    defaultValues: blankCourtValues(),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await create.mutateAsync(values);
      reset(blankCourtValues());
      setOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.messageAr : 'Could not add the court.');
    }
  });

  if (!open) {
    return (
      <Button type="button" variant="secondary" block onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add court or authority
      </Button>
    );
  }

  return (
    <SettingsSection
      title="Add to office directory"
      description="The new authority becomes available when recording a case."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <CourtFields register={register} errors={errors} />

        {formError ? (
          <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" loading={create.isPending}>
            Save court
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset(blankCourtValues());
              setFormError(null);
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

function EditCourtForm({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useCourt(id);
  const update = useUpdateCourt(id);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateCourtInput>({
    resolver: zodResolver(updateCourtSchema),
    defaultValues: { ...blankCourtValues(), version: 0 },
  });

  useEffect(() => {
    if (!query.data) return;
    reset(detailToForm(query.data));
  }, [query.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await update.mutateAsync(values);
      reset(detailToForm(saved));
      onClose();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.messageAr : 'Could not edit the court.');
    }
  });

  return (
    <SettingsSection
      title="Edit court"
      description="Editing updates the directory and linked cases without changing the case history."
    >
      {query.isLoading ? (
        <p className="text-sm text-ink-muted">Loading court details...</p>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {/* UpdateCourtInput is CreateCourtInput plus `version`, so the same
              field component is safe after narrowing away that one extra key. */}
          <CourtFields
            register={register as unknown as UseFormRegister<CreateCourtInput>}
            errors={errors as unknown as FieldErrors<CreateCourtInput>}
          />
          <input type="hidden" {...register('version')} />

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" loading={update.isPending}>
              Save changes
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </SettingsSection>
  );
}

function CourtFields({
  register,
  errors,
}: {
  register: UseFormRegister<CreateCourtInput>;
  errors: FieldErrors<CreateCourtInput>;
}) {
  return (
    <>
      <Field label="Court name" required error={errors.name?.message}>
        {(props) => (
          <Input {...props} {...register('name')} placeholder="Example: Civil Court..." />
        )}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" required error={errors.type?.message}>
          {(props) => (
            <select
              {...props}
              {...register('type')}
              className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
            >
              {COURT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {COURT_TYPE_AR[item]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Judicial authority" required error={errors.jurisdiction?.message}>
          {(props) => (
            <select
              {...props}
              {...register('jurisdiction')}
              className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
            >
              {JURISDICTIONS.map((item) => (
                <option key={item} value={item}>
                  {JURISDICTION_AR[item]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Governorate" error={errors.governorate?.message}>
          {(props) => (
            <select
              {...props}
              {...register('governorate')}
              className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
            >
              <option value="">Not specified</option>
              {IRAQ_GOVERNORATES.map((item) => (
                <option key={item} value={item}>
                  {uiEnglish(item, item)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Appeal region" error={errors.appealRegion?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('appealRegion')}
              placeholder="Example: Baghdad / Karkh"
            />
          )}
        </Field>
      </div>

      <Field label="Address" error={errors.address?.message}>
        {(props) => <Input {...props} {...register('address')} />}
      </Field>

      <Field label="Phone" error={errors.phone?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('phone')}
            inputMode="tel"
            dir="ltr"
            className="text-start"
          />
        )}
      </Field>

      <Field label="Notes" error={errors.notes?.message}>
        {(props) => <Textarea {...props} {...register('notes')} rows={2} />}
      </Field>
    </>
  );
}

function blankCourtValues(): CreateCourtInput {
  return {
    name: '',
    type: 'FIRST_INSTANCE',
    jurisdiction: 'FEDERAL',
    governorate: '',
    appealRegion: '',
    address: '',
    phone: '',
    notes: '',
  };
}

function detailToForm(court: CourtDetail): UpdateCourtInput {
  return {
    name: court.name,
    type: court.type,
    jurisdiction: court.jurisdiction,
    governorate: court.governorate ?? '',
    appealRegion: court.appealRegion ?? '',
    address: court.address ?? '',
    phone: court.phone ?? '',
    notes: court.notes ?? '',
    version: court.version,
  };
}
