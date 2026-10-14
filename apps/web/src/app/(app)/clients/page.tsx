'use client';

import { Building2, Plus, Search, SlidersHorizontal, Star, User, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import {
  CLIENT_KINDS,
  CLIENT_KIND_AR,
  CLIENT_SORTS,
  CLIENT_SORT_AR,
  formatIraqiMobile,
  type ClientKind,
  type ClientListItem,
  type ClientSort,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Skeleton, cn } from '@muhami/ui';
import { ClientFormSheet } from '@/components/clients/client-form-sheet';
import { ApiError } from '@/lib/api-client';
import { useClientList } from '@/lib/api/clients';
import { Can, useAuth } from '@/lib/auth-context';
import { useDebounced } from '@/lib/use-debounced';

export default function ClientsPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ClientKind | undefined>();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<ClientSort>('recent');
  const [formOpen, setFormOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounced(search);

  const filters = useMemo(
    () => ({ search: debouncedSearch || undefined, kind, isFavorite: favoritesOnly, sort }),
    [debouncedSearch, kind, favoritesOnly, sort],
  );

  const query = useClientList(filters);
  const clients = query.data?.pages.flatMap((page) => page.items) ?? [];
  const hasFilters = Boolean(kind) || favoritesOnly || debouncedSearch.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-ink lg:text-2xl">Clients</h1>
        <Can permission="client:create">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New client
          </Button>
        </Can>
      </div>

      {/* One box, three targets — name, mobile, national ID. */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-ink-subtle"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, mobile number or ID number"
          aria-label="Search clients"
          className="ps-9 pe-12"
          type="search"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch('')}
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
          aria-controls="client-filters"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters{kind || favoritesOnly ? ' - Enabled' : ''}
        </Button>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Sort
          <select
            aria-label="Sort Clients"
            value={sort}
            onChange={(event) => setSort(event.target.value as ClientSort)}
            className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink"
          >
            {CLIENT_SORTS.map((option) => (
              <option key={option} value={option}>
                {CLIENT_SORT_AR[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filtersOpen ? (
        <Card id="client-filters" className="space-y-3 p-4">
          <p className="text-sm font-medium text-ink">Filter clients by</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>
              <Star className={cn('size-4', favoritesOnly && 'fill-current')} aria-hidden />
              Favourites
            </FilterChip>
            {CLIENT_KINDS.map((option) => (
              <FilterChip
                key={option}
                active={kind === option}
                onClick={() => setKind((current) => (current === option ? undefined : option))}
              >
                {CLIENT_KIND_AR[option]}
              </FilterChip>
            ))}
          </div>
          {kind || favoritesOnly ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKind(undefined);
                setFavoritesOnly(false);
              }}
            >
              Clear filter
            </Button>
          ) : null}
        </Card>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[4.5rem] w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={User}
          title={hasFilters ? 'No matching results' : 'Add your first client'}
          description={
            hasFilters
              ? 'Change the search or clear the filters.'
              : 'A name and mobile number are enough to create a client file.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setKind(undefined);
                  setFavoritesOnly(false);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Can permission="client:create">
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  Add client
                </Button>
              </Can>
            )
          }
        />
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-line">
              {clients.map((client) => (
                <ClientRow key={client.id} client={client} />
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
              {clients.length} {clients.length === 1 ? 'client' : 'clients'}
            </p>
          )}
        </>
      )}

      <ClientFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(saved) => {
          if (can('client:read.all')) router.push(`/clients/${saved.id}`);
        }}
      />
    </div>
  );
}

function ClientRow({ client }: { client: ClientListItem }) {
  const Icon = client.kind === 'COMPANY' ? Building2 : User;

  return (
    <li>
      <Link
        href={`/clients/${client.id}`}
        className="flex items-center gap-3 p-3.5 transition-colors hover:bg-surface-sunken"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
          <Icon className="size-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-ink">{client.fullName}</span>
            {client.isFavorite ? (
              <Star
                className="size-3.5 shrink-0 fill-warning text-warning"
                aria-label="Favourite"
              />
            ) : null}
          </span>
          <span className="ltr-numerals block truncate text-xs text-ink-subtle">
            {formatIraqiMobile(client.mobile)}
          </span>
        </span>

        {client.activeCaseCount > 0 ? (
          <Badge tone="brand">{client.activeCaseCount} active case</Badge>
        ) : client.caseCount > 0 ? (
          <Badge tone="neutral">
            {client.caseCount} {client.caseCount === 1 ? 'case' : 'cases'}
          </Badge>
        ) : null}
      </Link>
    </li>
  );
}

function FilterChip({
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
