'use client';

import { Clock, CornerDownLeft, Search, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SEARCH_GROUP_AR, type SearchHit } from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Skeleton, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useGlobalSearch, useRecentSearches } from '@/lib/api/search';
import { useDebounced } from '@/lib/use-debounced';

/**
 * Global search.
 *
 * Fully keyboard-driven: ↑/↓ move through the flattened result list across all
 * groups, Enter opens, Escape clears. A lawyer looking for a case mid-call
 * should never have to reach for the mouse.
 */
export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [term, setTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const debounced = useDebounced(term, 250);
  const { recent, remember, clear } = useRecentSearches();
  const query = useGlobalSearch(debounced);

  /** All hits in display order, so arrow keys cross group boundaries naturally. */
  const flatHits = useMemo(
    () => query.data?.groups.flatMap((group) => group.hits) ?? [],
    [query.data],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // A new result set invalidates the old cursor position.
  useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  const openHit = (hit: SearchHit) => {
    remember(term);
    router.push(hit.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (flatHits.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flatHits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + flatHits.length) % flatHits.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hit = flatHits[activeIndex];
      if (hit) openHit(hit);
    } else if (event.key === 'Escape') {
      setTerm('');
    }
  };

  const hasQuery = debounced.trim().length >= 2;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-ink lg:text-2xl">Global search</h1>

      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-ink-subtle"
          aria-hidden
        />
        <Input
          ref={inputRef}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search for a client, case, document, hearing or receipt"
          aria-label="Global search"
          role="combobox"
          aria-expanded={flatHits.length > 0}
          aria-controls="search-results"
          aria-activedescendant={
            flatHits[activeIndex] ? `hit-${flatHits[activeIndex].id}` : undefined
          }
          className="px-9 text-base"
          type="search"
          autoComplete="off"
        />
        {term ? (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="Clear search"
            className="absolute inset-y-0 end-2 my-auto flex size-7 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {!hasQuery ? (
        <RecentSearches recent={recent} onPick={setTerm} onClear={clear} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : flatHits.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          description="Try a shorter word or part of the name or case number."
        />
      ) : (
        <div id="search-results" className="space-y-4">
          {query.data!.usedFuzzy ? (
            <p className="flex items-center gap-1.5 rounded-md bg-info-subtle px-3 py-2 text-sm text-info">
              <Sparkles className="size-4 shrink-0" aria-hidden />
              No exact match found. These are the closest results.
            </p>
          ) : null}

          {query.data!.groups.map((group) => (
            <section key={group.group} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                  {SEARCH_GROUP_AR[group.group]}
                </h2>
                {group.total > group.hits.length ? (
                  <span className="ltr-numerals text-xs text-ink-subtle">
                    {group.hits.length} of {group.total}
                  </span>
                ) : null}
              </div>

              <Card>
                <ul className="divide-y divide-line">
                  {group.hits.map((hit) => {
                    const index = flatHits.indexOf(hit);
                    return (
                      <HitRow
                        key={`${hit.group}-${hit.id}`}
                        hit={hit}
                        active={index === activeIndex}
                        onSelect={() => openHit(hit)}
                        onHover={() => setActiveIndex(index)}
                      />
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}

          <p className="ltr-numerals pb-2 text-center text-xs text-ink-subtle">
            {query.data!.tookMs} ms
          </p>
        </div>
      )}
    </div>
  );
}

function HitRow({
  hit,
  active,
  onSelect,
  onHover,
}: {
  hit: SearchHit;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);

  // Keep the keyboard cursor in view when it moves past the fold.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <li ref={ref} id={`hit-${hit.id}`} role="option" aria-selected={active}>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onHover}
        className={cn(
          'flex w-full items-center gap-3 p-3.5 text-start transition-colors',
          active ? 'bg-brand-subtle' : 'hover:bg-surface-sunken',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{hit.title}</span>
          {hit.subtitle ? (
            <span className="block truncate text-xs text-ink-muted">{hit.subtitle}</span>
          ) : null}
        </span>

        {hit.meta ? <Badge tone="neutral">{hit.meta}</Badge> : null}

        {active ? <CornerDownLeft className="size-4 shrink-0 text-brand" aria-hidden /> : null}
      </button>
    </li>
  );
}

function RecentSearches({
  recent,
  onPick,
  onClear,
}: {
  recent: string[];
  onPick: (term: string) => void;
  onClear: () => void;
}) {
  if (recent.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Search everything in one place"
        description="Client names, case numbers, opponents, document titles and receipt numbers use the same search box."
      />
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          <Clock className="size-3.5" aria-hidden />
          Recent searches
        </h2>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {recent.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPick(item)}
            className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}
