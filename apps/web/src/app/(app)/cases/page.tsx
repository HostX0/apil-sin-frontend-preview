'use client';

import { CaseNumber } from '@/components/cases/case-number';
import { Plus, Scale, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CASE_SORTS,
  CASE_SORT_AR,
  CASE_STATUSES,
  CASE_STATUS_AR,
  CASE_TYPES,
  CASE_TYPE_AR,
  formatLongDateAr,
  type CaseListItem,
  type CaseStatus,
  type CaseType,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Skeleton, cn } from '@muhami/ui';
import { CaseFormSheet } from '@/components/cases/case-form-sheet';
import { CaseStatusBadge } from '@/components/cases/case-status-badge';
import { SavedSearchBar } from '@/components/search/saved-search-bar';
import { ApiError } from '@/lib/api-client';
import { useCaseList } from '@/lib/api/cases';
import { Can, useAuth } from '@/lib/auth-context';
import { useDebounced } from '@/lib/use-debounced';

export default function CasesPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CasesView />
    </Suspense>
  );
}

/**
 * Filter state lives in the URL, not in component state.
 *
 * That is what makes a filtered view shareable — a lawyer can send "all urgent
 * enforcement cases" to a colleague as a link, and the back button behaves the
 * way people expect.
 */
function CasesView() {
  const router = useRouter();
  const { can } = useAuth();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get('q') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // `?new=1` opens the create sheet on load. It is what the PWA "دعوى جديدة"
  // shortcut targets: a home-screen tap lands on the form, not on a list the
  // user then has to find a button in.
  const [formOpen, setFormOpen] = useState(params.get('new') === '1' && can('case:create'));
  const searchInput = useRef<HTMLInputElement>(null);
  const queryText = params.get('q') ?? '';
  useEffect(() => {
    if (document.activeElement !== searchInput.current) setSearch(queryText);
  }, [queryText]);
  const debouncedSearch = useDebounced(search);

  const selectedTypes = (params.get('type')?.split(',').filter(Boolean) ?? []) as CaseType[];
  const selectedStatuses = (params.get('status')?.split(',').filter(Boolean) ?? []) as CaseStatus[];
  const favoritesOnly = params.get('fav') === '1';
  const mineOnly = params.get('mine') === '1';
  const activeOnly = params.get('active') === '1';
  const sort =
    CASE_SORTS.find((option) => option !== 'nextHearing' && option === params.get('sort')) ??
    'activity';

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      router.replace(`/cases?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = params.get(key)?.split(',').filter(Boolean) ?? [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      setParam(key, next.length > 0 ? next.join(',') : null);
    },
    [params, setParam],
  );

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      caseType: selectedTypes.length > 0 ? selectedTypes : undefined,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      isFavorite: favoritesOnly,
      assignedToMe: mineOnly,
      activeOnly,
      sort,
    }),
    [debouncedSearch, selectedTypes, selectedStatuses, favoritesOnly, mineOnly, activeOnly, sort],
  );

  const query = useCaseList(filters);
  const cases = query.data?.pages.flatMap((page) => page.items) ?? [];

  const activeFilterCount =
    selectedTypes.length +
    selectedStatuses.length +
    (favoritesOnly ? 1 : 0) +
    (mineOnly ? 1 : 0) +
    (activeOnly ? 1 : 0);

  const hasAnyFilter = activeFilterCount > 0 || debouncedSearch.length > 0;

  const clearAll = () => {
    setSearch('');
    router.replace('/cases', { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-ink lg:text-2xl">Cases</h1>
        <Can permission="case:create">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New case
          </Button>
        </Can>
      </div>

      {/* The three required search targets, in one box. */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-ink-subtle"
          aria-hidden
        />
        <Input
          ref={searchInput}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setParam('q', event.target.value || null);
          }}
          placeholder="Search client name, case number or opponent"
          aria-label="Search cases"
          className="ps-9 pe-12"
          type="search"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setParam('q', null);
            }}
            aria-label="Clear search"
            className="absolute inset-y-0 end-0 my-auto flex min-h-11 w-11 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11"
          aria-expanded={filtersOpen}
          aria-controls="case-filters"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Button>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Sort
          <select
            aria-label="Sort Cases"
            value={sort}
            onChange={(event) => setParam('sort', event.target.value)}
            className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink"
          >
            {CASE_SORTS.filter((option) => option !== 'nextHearing').map((option) => (
              <option key={option} value={option}>
                {CASE_SORT_AR[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtersOpen ? (
        <Card id="case-filters" className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Chip active={activeOnly} onClick={() => setParam('active', activeOnly ? null : '1')}>
              Active only
            </Chip>
            <Chip active={mineOnly} onClick={() => setParam('mine', mineOnly ? null : '1')}>
              Assigned to me
            </Chip>
            <Chip
              active={favoritesOnly}
              onClick={() => setParam('fav', favoritesOnly ? null : '1')}
            >
              <Star className={cn('size-4', favoritesOnly && 'fill-current')} aria-hidden />
              Favourites
            </Chip>
          </div>
          <FilterGroup
            title="Case type"
            options={CASE_TYPES.map((value) => ({ value, label: CASE_TYPE_AR[value] }))}
            selected={selectedTypes}
            onToggle={(value) => toggleInList('type', value)}
          />
          <FilterGroup
            title="Case status"
            options={CASE_STATUSES.map((value) => ({ value, label: CASE_STATUS_AR[value] }))}
            selected={selectedStatuses}
            onToggle={(value) => toggleInList('status', value)}
          />
          <SavedSearchBar scope="CASES" exportScope="CASES" basePath="/cases" />
          {hasAnyFilter ? (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all filters
            </Button>
          ) : null}
        </Card>
      ) : null}

      {query.isLoading ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={hasAnyFilter ? 'No matching cases' : 'No cases recorded yet'}
          description={
            hasAnyFilter
              ? 'Change the search or clear the filters.'
              : 'Start by recording the first office case.'
          }
          action={
            hasAnyFilter ? (
              <Button variant="secondary" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            ) : (
              <Can permission="case:create">
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  Record case
                </Button>
              </Can>
            )
          }
        />
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-line">
              {cases.map((item) => (
                <CaseRow key={item.id} item={item} />
              ))}
            </ul>
          </Card>

          {query.hasNextPage ? (
            <Button
              variant="secondary"
              block
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Show more
            </Button>
          ) : (
            <p className="pb-2 text-center text-xs text-ink-subtle">
              {cases.length} {cases.length === 1 ? 'case' : 'cases'}
            </p>
          )}
        </>
      )}

      <CaseFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(saved) => {
          if (can('case:read.all')) router.push(`/cases/${saved.id}`);
        }}
      />
    </div>
  );
}

function CaseRow({ item }: { item: CaseListItem }) {
  return (
    <li>
      <Link
        href={`/cases/${item.id}`}
        className="flex flex-col gap-1.5 p-3.5 transition-colors hover:bg-surface-sunken"
      >
        <div className="flex items-center gap-2">
          <span className="ltr-numerals text-sm font-semibold text-ink">
            <CaseNumber value={item.numberDisplay} />
          </span>
          <CaseStatusBadge status={item.status} />
          {item.priority === 'URGENT' ? <Badge tone="danger">Urgent</Badge> : null}
          {item.isFavorite ? (
            <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-label="Favourite" />
          ) : null}
        </div>

        <p className="truncate text-sm text-ink">
          {item.clientName}
          {item.opponentName ? (
            <>
              <span className="mx-1.5 text-ink-subtle">×</span>
              <span className="text-ink-muted">{item.opponentName}</span>
            </>
          ) : null}
        </p>

        <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
          <span>{CASE_TYPE_AR[item.caseType]}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{item.courtName}</span>
          {item.nextHearingAt ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-brand">
                Hearing {formatLongDateAr(new Date(item.nextHearingAt))}
              </span>
            </>
          ) : null}
        </p>
      </Link>
    </li>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Chip
            key={option.value}
            active={selected.includes(option.value)}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center gap-1.5 min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-brand bg-brand-subtle text-brand'
          : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
      )}
    >
      {children}
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}
