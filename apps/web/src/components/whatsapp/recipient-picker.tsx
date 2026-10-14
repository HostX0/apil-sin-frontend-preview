'use client';

import { Search, UserRound, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { formatIraqiMobile, type WhatsAppRecipientType } from '@muhami/shared';
import { Button, EmptyState, ErrorState, Input, Skeleton, cn } from '@muhami/ui';
import { useClientList } from '@/lib/api/clients';
import { useLawyers } from '@/lib/api/lawyers';
import { useDebounced } from '@/lib/use-debounced';

export interface MessageRecipient {
  type: WhatsAppRecipientType;
  id: string;
  name: string;
  phone: string | null;
}

export function RecipientPicker({
  recipientType,
  selected,
  disabled,
  onSelect,
}: {
  recipientType: WhatsAppRecipientType;
  selected: MessageRecipient | null;
  disabled: boolean;
  onSelect: (recipient: MessageRecipient) => void;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-ink" htmlFor="whatsapp-recipient-search">
        {recipientType === 'client' ? 'Choose an existing client' : 'Choose an office lawyer'}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-3.5 size-4 text-ink-subtle"
          aria-hidden
        />
        <Input
          id="whatsapp-recipient-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            recipientType === 'client' ? 'Search name or mobile number' : 'Search by lawyer name'
          }
          disabled={disabled}
          className="ps-10"
        />
      </div>
      {recipientType === 'client' ? (
        <ClientOptions
          search={debounced}
          selected={selected}
          disabled={disabled}
          onSelect={onSelect}
        />
      ) : (
        <LawyerOptions
          search={debounced}
          selected={selected}
          disabled={disabled}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function ClientOptions({
  search,
  selected,
  disabled,
  onSelect,
}: {
  search: string;
  selected: MessageRecipient | null;
  disabled: boolean;
  onSelect: (recipient: MessageRecipient) => void;
}) {
  const query = useClientList({ search, limit: 25, sort: 'name' });
  const options = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (query.isError)
    return <ErrorState title="Could not load clients" onRetry={() => void query.refetch()} />;

  return (
    <>
      {options.length ? (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
          {options.map((client) => (
            <li key={client.id}>
              <RecipientOption
                recipient={{
                  type: 'client',
                  id: client.id,
                  name: client.fullName,
                  phone: client.mobile,
                }}
                selected={selected?.type === 'client' && selected.id === client.id}
                disabled={disabled || !client.mobile}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={UsersRound}
          title="No matching clients"
          description="Try another name or number, or add the client first."
        />
      )}
      {query.hasNextPage ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more clients
        </Button>
      ) : null}
    </>
  );
}

function LawyerOptions({
  search,
  selected,
  disabled,
  onSelect,
}: {
  search: string;
  selected: MessageRecipient | null;
  disabled: boolean;
  onSelect: (recipient: MessageRecipient) => void;
}) {
  const query = useLawyers({ search });
  if (query.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (query.isError)
    return <ErrorState title="Could not load lawyers" onRetry={() => void query.refetch()} />;

  return query.data?.length ? (
    <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
      {query.data.map((lawyer) => (
        <li key={lawyer.id}>
          <RecipientOption
            recipient={{
              type: 'lawyer',
              id: lawyer.id,
              name: lawyer.fullName,
              phone: lawyer.phone,
            }}
            selected={selected?.type === 'lawyer' && selected.id === lawyer.id}
            disabled={disabled || !lawyer.phone}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState
      icon={UserRound}
      title="No matching lawyers"
      description="Add the lawyer and their mobile number in Office lawyers."
    />
  );
}

function RecipientOption({
  recipient,
  selected,
  disabled,
  onSelect,
}: {
  recipient: MessageRecipient;
  selected: boolean;
  disabled: boolean;
  onSelect: (recipient: MessageRecipient) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(recipient)}
      className={cn(
        'flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        selected ? 'bg-brand-subtle text-brand' : 'text-ink hover:bg-surface-sunken',
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{recipient.name}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">
          {recipient.phone ? (
            <span dir="ltr">{formatIraqiMobile(recipient.phone)}</span>
          ) : recipient.type === 'lawyer' ? (
            'Add the lawyer’s mobile number first'
          ) : (
            'Add the client’s mobile number first'
          )}
        </span>
      </span>
      {selected ? <span className="shrink-0 text-xs font-semibold">Selected</span> : null}
    </button>
  );
}
