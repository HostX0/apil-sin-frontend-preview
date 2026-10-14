'use client';

import { useState } from 'react';
import { ClipboardList, Files, Plus, Search, Wallet } from 'lucide-react';
import {
  TRANSACTION_STATUS_AR,
  formatLongDateAr,
  type TransactionStatus,
  type TransactionSummary,
} from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Sheet,
  SheetContent,
  Skeleton,
} from '@muhami/ui';
import { AccountFinanceSection } from '@/components/finance/account-finance-section';
import { DocumentList } from '@/components/documents/document-list';
import { TransactionFormSheet } from '@/components/transactions/transaction-form-sheet';
import { useTransactions } from '@/lib/api/transactions';
import { useAuth } from '@/lib/auth-context';
import { useDebounced } from '@/lib/use-debounced';

export default function TransactionsPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TransactionStatus | ''>('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionSummary | undefined>();
  const [financeTransaction, setFinanceTransaction] = useState<TransactionSummary | null>(null);
  const [documentTransaction, setDocumentTransaction] = useState<TransactionSummary | null>(null);
  const debounced = useDebounced(search, 250);
  const query = useTransactions(
    { search: debounced || undefined, status: status || undefined },
    can('transaction:read'),
  );
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (!can('transaction:read'))
    return (
      <EmptyState
        icon={ClipboardList}
        title="Transactions are unavailable"
        description="Ask the office manager for access."
      />
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Office work follow-up</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">Transactions</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Track work with a department or authority, its documents and completion status.
          </p>
        </div>
        {can('transaction:create') ? (
          <Button
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add transaction
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-3.5 size-4 text-ink-subtle"
            aria-hidden
          />
          <Input
            aria-label="Search transactions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search type, department or client"
            className="ps-9"
          />
        </div>
        <select
          aria-label="Transaction status"
          value={status}
          onChange={(event) => setStatus(event.target.value as TransactionStatus | '')}
          className="h-11 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
        >
          <option value="">All statuses</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search || status ? 'No matching transactions' : 'Add your first transaction'}
          description={
            search || status
              ? 'Change the search or status to show other transactions.'
              : 'Add a transaction and link it to a client and lawyer to follow its progress.'
          }
          action={
            search || status ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                }}
              >
                Clear search and filters
              </Button>
            ) : can('transaction:create') ? (
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setOpen(true);
                }}
              >
                Add transaction
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words font-semibold text-ink">{row.type}</h2>
                <Badge tone={row.status === 'COMPLETED' ? 'success' : 'warning'}>
                  {TRANSACTION_STATUS_AR[row.status]}
                </Badge>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-ink-muted">Department</dt>
                <dd className="min-w-0 break-words">{row.department}</dd>
                <dt className="text-ink-muted">Client</dt>
                <dd className="min-w-0 break-words">{row.clientName}</dd>
                <dt className="text-ink-muted">Lawyer</dt>
                <dd className="min-w-0 break-words">{row.assignedLawyerName}</dd>
                <dt className="text-ink-muted">Added on</dt>
                <dd className="min-w-0 break-words">{formatLongDateAr(new Date(row.addedAt))}</dd>
              </dl>
              {row.notes ? (
                <p className="whitespace-pre-wrap text-sm text-ink-muted">{row.notes}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {can('document:read') ? (
                  <Button variant="secondary" size="sm" onClick={() => setDocumentTransaction(row)}>
                    <Files className="size-4" aria-hidden />
                    Transaction documents
                  </Button>
                ) : null}
                {can('finance:read.summary') && can('feeagreement:read') && can('payment:read') ? (
                  <Button variant="secondary" size="sm" onClick={() => setFinanceTransaction(row)}>
                    <Wallet className="size-4" aria-hidden />
                    Transaction fees and expenses
                  </Button>
                ) : null}
                {row.canUpdate ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditing(row);
                      setOpen(true);
                    }}
                  >
                    Update transaction
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          block
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more
        </Button>
      ) : null}
      <Sheet
        open={documentTransaction !== null}
        onOpenChange={(next) => {
          if (!next) setDocumentTransaction(null);
        }}
      >
        <SheetContent
          title="Transaction documents"
          description={
            documentTransaction
              ? `${documentTransaction.type} — ${documentTransaction.clientName}`
              : undefined
          }
        >
          {documentTransaction ? (
            <DocumentList
              key={documentTransaction.id}
              filters={{ transactionId: documentTransaction.id }}
              transactionId={documentTransaction.id}
              clientId={documentTransaction.clientId}
              allowUpload={documentTransaction.canUpdate}
              emptyDescription="Upload transaction letters and notices here to keep them with the file."
            />
          ) : null}
        </SheetContent>
      </Sheet>
      <Sheet
        open={financeTransaction !== null}
        onOpenChange={(next) => {
          if (!next) setFinanceTransaction(null);
        }}
      >
        <SheetContent
          title="Transaction finance"
          description={
            financeTransaction
              ? `${financeTransaction.type} — ${financeTransaction.clientName}`
              : undefined
          }
        >
          {financeTransaction ? (
            <AccountFinanceSection
              key={financeTransaction.id}
              transactionId={financeTransaction.id}
              transactionTitle={financeTransaction.type}
              clientId={financeTransaction.clientId}
              clientName={financeTransaction.clientName}
            />
          ) : null}
        </SheetContent>
      </Sheet>
      <TransactionFormSheet open={open} onOpenChange={setOpen} transaction={editing} />
    </div>
  );
}
