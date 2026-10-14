'use client';

import { uiEnglish } from '@/lib/ui-english';

import { MapPin, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  COURT_TYPES,
  COURT_TYPE_AR,
  IRAQ_GOVERNORATES,
  JURISDICTIONS,
  JURISDICTION_AR,
  createCourtSchema,
  type CourtSummary,
  type CourtType,
  type Jurisdiction,
} from '@/lib/ui-shared';
import { Button, Input } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useCourts, useCreateCourt, useSeedCourts } from '@/lib/api/cases';
import { useAuth } from '@/lib/auth-context';
import { useDebounced } from '@/lib/use-debounced';

/**
 * Court picker for case creation/editing.
 *
 * A native select containing every court in Iraq becomes unusable very quickly,
 * especially on a phone. The picker narrows the server-side list by governorate
 * and Arabic search while preserving the currently selected court if filters
 * temporarily hide it.
 */
export function CourtPicker({
  value,
  onChange,
  id,
  describedBy,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [addingCourt, setAddingCourt] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<CourtSummary | null>(null);
  const debouncedSearch = useDebounced(search);
  // The shared Arabic search deliberately ignores one-character terms. Do not
  // send those terms to the server and then tell the user they were filtered.
  const effectiveSearch = debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined;

  const courts = useCourts({
    search: effectiveSearch,
    governorate: governorate || undefined,
  });
  const seedCourts = useSeedCourts();

  useEffect(() => {
    if (!value || !courts.data) return;
    const selected = courts.data.find((court) => court.id === value);
    if (selected) setSelectedSnapshot(selected);
  }, [courts.data, value]);

  const options = useMemo(() => {
    const rows = courts.data ?? [];
    if (!selectedSnapshot || !value || rows.some((court) => court.id === value)) return rows;
    return [selectedSnapshot, ...rows];
  }, [courts.data, selectedSnapshot, value]);

  const isFiltering = Boolean(effectiveSearch || governorate);
  const isEmptyOffice = courts.isSuccess && !isFiltering && options.length === 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <label htmlFor="case-court-search" className="relative block">
          <span className="sr-only">Search for a court</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <Input
            id="case-court-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by court name…"
            className="ps-9"
            autoComplete="off"
          />
        </label>

        <label className="relative block">
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
      </div>

      <select
        id={id}
        aria-label="Court"
        value={value}
        disabled={courts.isLoading || courts.isError}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
      >
        <option value="">{courts.isLoading ? 'Loading courts…' : 'Choose a court…'}</option>
        {options.map((court) => (
          <option key={court.id} value={court.id}>
            {court.name}
            {court.governorate ? ` — ${uiEnglish(court.governorate, court.governorate)}` : ''}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-subtle">
        <span>
          {courts.isError
            ? 'Could not load courts.'
            : courts.isLoading
              ? 'Loading courts…'
              : options.length > 0
                ? `${options.length} results${governorate ? ` in ${uiEnglish(governorate, governorate)}` : ''}`
                : isFiltering
                  ? 'No court matches this name or governorate.'
                  : 'No courts registered.'}
        </span>
        <Link
          href="/more/courts"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the court directory in a new window"
          className="font-medium text-brand hover:underline"
        >
          Open court directory
        </Link>
      </div>

      {courts.isError ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => void courts.refetch()}>
          Reload courts
        </Button>
      ) : null}

      {search.trim().length === 1 ? (
        <p className="text-xs text-ink-subtle">Enter at least two characters to search by name.</p>
      ) : null}

      {can('case:create') ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setAddingCourt((open) => !open)}
        >
          <Plus className="size-4" />
          {addingCourt ? 'Close Add court' : 'Add a new court'}
        </Button>
      ) : null}

      {addingCourt ? (
        <QuickCourtCreate
          initialGovernorate={governorate}
          onCreated={(court) => {
            setSelectedSnapshot(court);
            onChange(court.id);
            setAddingCourt(false);
          }}
        />
      ) : null}

      {isEmptyOffice && can('case:create') ? (
        <div className="rounded-md bg-info-subtle p-3">
          <p className="mb-2 text-sm text-info">
            Add the court you need, or add the standard court list and choose from it.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={seedCourts.isPending}
            onClick={() => seedCourts.mutate()}
          >
            Add standard court list
          </Button>
          {seedCourts.isError ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              Could not add the list. Try again.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** No nested form: the picker already lives inside the case-registration form. */
function QuickCourtCreate({
  initialGovernorate,
  onCreated,
}: {
  initialGovernorate: string;
  onCreated: (court: CourtSummary) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CourtType>('FIRST_INSTANCE');
  const [governorate, setGovernorate] = useState(initialGovernorate);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('FEDERAL');
  const [error, setError] = useState<string | null>(null);
  const create = useCreateCourt();

  const save = async () => {
    if (create.isPending) return;
    setError(null);
    const parsed = createCourtSchema.safeParse({ name, type, governorate, jurisdiction });
    if (!parsed.success) {
      setError(
        uiEnglish(
          parsed.error.issues[0]?.message ?? 'Check the court details.',
          'Check the court details.',
        ),
      );
      return;
    }
    try {
      onCreated(await create.mutateAsync(parsed.data));
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.messageAr : 'Could not add the court.');
    }
  };

  return (
    <fieldset
      className="space-y-3 rounded-md border border-line bg-surface-sunken p-3"
      disabled={create.isPending}
    >
      <legend className="px-1 text-sm font-medium text-ink">
        Add a court to the office directory
      </legend>
      <p className="text-xs text-ink-subtle">
        Save the court here to make it available for this case and future cases.
      </p>
      <label htmlFor="quick-court-name" className="block space-y-1 text-sm text-ink">
        <span>
          Court name <span className="text-danger">*</span>
        </span>
        <Input
          id="quick-court-name"
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void save();
          }}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Example: Al-Mansour Court of First Instance"
        />
      </label>
      <label htmlFor="quick-court-type" className="block space-y-1 text-sm text-ink">
        <span>Court type</span>
        <select
          id="quick-court-type"
          value={type}
          onChange={(event) => setType(event.target.value as CourtType)}
          className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
        >
          {COURT_TYPES.map((item) => (
            <option key={item} value={item}>
              {COURT_TYPE_AR[item]}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="quick-court-governorate" className="block space-y-1 text-sm text-ink">
        <span>Governorate (optional)</span>
        <Input
          id="quick-court-governorate"
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void save();
          }}
          value={governorate}
          onChange={(event) => setGovernorate(event.target.value)}
          placeholder="Governorate"
        />
      </label>
      <label htmlFor="quick-court-jurisdiction" className="block space-y-1 text-sm text-ink">
        <span>Judicial authority</span>
        <select
          id="quick-court-jurisdiction"
          value={jurisdiction}
          onChange={(event) => setJurisdiction(event.target.value as Jurisdiction)}
          className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
        >
          {JURISDICTIONS.map((item) => (
            <option key={item} value={item}>
              {JURISDICTION_AR[item]}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="button" size="sm" loading={create.isPending} onClick={() => void save()}>
        Save and select court
      </Button>
    </fieldset>
  );
}
