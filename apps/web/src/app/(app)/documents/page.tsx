'use client';

import { Search, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  DOCUMENT_SORTS,
  DOCUMENT_SORT_AR,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_AR,
  type DocumentSort,
  type DocumentType,
} from '@/lib/ui-shared';
import { Input, cn } from '@muhami/ui';
import { DocumentList } from '@/components/documents/document-list';
import { useDebounced } from '@/lib/use-debounced';

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState<DocumentType | undefined>();
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [sort, setSort] = useState<DocumentSort>('recent');

  const debouncedSearch = useDebounced(search);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      docType,
      // 30 days: long enough to act on a certification renewal, short enough to
      // stay a short list.
      expiringWithinDays: expiringSoon ? 30 : undefined,
      sort,
    }),
    [debouncedSearch, docType, expiringSoon, sort],
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-ink lg:text-2xl">Documents</h1>

      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-ink-subtle"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search document titles"
          aria-label="Search documents"
          className="px-9"
          type="search"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute inset-y-0 end-2 my-auto flex size-7 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <Chip active={expiringSoon} onClick={() => setExpiringSoon((value) => !value)}>
          Expiring within 30 days
        </Chip>

        <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />

        {DOCUMENT_TYPES.map((option) => (
          <Chip
            key={option}
            active={docType === option}
            onClick={() => setDocType((current) => (current === option ? undefined : option))}
          >
            {DOCUMENT_TYPE_AR[option]}
          </Chip>
        ))}

        <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />

        {DOCUMENT_SORTS.map((option) => (
          <Chip key={option} active={sort === option} onClick={() => setSort(option)}>
            {DOCUMENT_SORT_AR[option]}
          </Chip>
        ))}
      </div>

      <DocumentList
        filters={filters}
        emptyDescription="All office documents appear here. Upload them from their case or client file."
      />
    </div>
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
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-brand bg-brand-subtle text-brand'
          : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
      )}
    >
      {children}
    </button>
  );
}
