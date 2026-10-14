'use client';

import { useId, useState } from 'react';
import { Check, Search, UserRound, ClipboardList } from 'lucide-react';
import { Button, EmptyState, ErrorState, Input, Skeleton, cn } from '@muhami/ui';
import { useClientList } from '@/lib/api/clients';
import { useTransactions } from '@/lib/api/transactions';
import { useDebounced } from '@/lib/use-debounced';

export type FinanceContext = {
  clientId?: string;
  clientName?: string;
  transactionId?: string;
  transactionTitle?: string;
};

export function FinanceContextPicker({
  mode,
  selected,
  onSelect,
  disabled = false,
}: {
  mode: 'client' | 'transaction';
  selected: FinanceContext | null;
  onSelect: (context: FinanceContext) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const id = useId();
  const debounced = useDebounced(search, 250);
  const clients = useClientList(
    { search: debounced || undefined, sort: 'name', limit: 20 },
    mode === 'client',
  );
  const transactions = useTransactions(
    { search: debounced || undefined, limit: 20 },
    mode === 'transaction',
  );
  const query = mode === 'client' ? clients : transactions;
  const choices =
    mode === 'client'
      ? (clients.data?.pages
          .flatMap((page) => page.items)
          .map((client) => ({
            id: client.id,
            title: client.fullName,
            subtitle: 'Existing client',
            context: { clientId: client.id, clientName: client.fullName },
          })) ?? [])
      : (transactions.data?.pages
          .flatMap((page) => page.items)
          .map((transaction) => ({
            id: transaction.id,
            title: transaction.type,
            subtitle: `${transaction.clientName} · ${transaction.department}`,
            context: {
              transactionId: transaction.id,
              transactionTitle: transaction.type,
              clientId: transaction.clientId,
              clientName: transaction.clientName,
            },
          })) ?? []);
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {mode === 'client' ? 'Choose client' : 'Choose transaction'}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-3.5 size-4 text-ink-muted"
          aria-hidden
        />
        <Input
          id={id}
          value={search}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            mode === 'client'
              ? 'Search by client name'
              : 'Search by transaction type or client name'
          }
          className="ps-10"
        />
      </div>
      {query.isLoading ? (
        <Skeleton className="h-32" />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : choices.length === 0 ? (
        <EmptyState
          icon={mode === 'client' ? UserRound : ClipboardList}
          title={mode === 'client' ? 'No matching clients' : 'No matching transactions'}
          description="Try another name. You can also create an independent financial file."
        />
      ) : (
        <ul className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
          {choices.map((choice) => {
            const active =
              (mode === 'client' ? selected?.clientId : selected?.transactionId) === choice.id;
            return (
              <li key={choice.id}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-14 w-full items-center justify-between gap-3 rounded-lg p-3 text-start disabled:opacity-50',
                    active ? 'bg-brand-subtle text-brand' : 'text-ink hover:bg-surface-sunken',
                  )}
                  onClick={() => onSelect(choice.context)}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{choice.title}</span>
                    <span className="mt-1 block text-xs text-ink-muted">{choice.subtitle}</span>
                  </span>
                  {active ? <Check className="size-4 shrink-0" aria-label="Selected" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {query.hasNextPage ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block
          loading={query.isFetchingNextPage}
          disabled={disabled}
          onClick={() => void query.fetchNextPage()}
        >
          Show more
        </Button>
      ) : null}
    </div>
  );
}
