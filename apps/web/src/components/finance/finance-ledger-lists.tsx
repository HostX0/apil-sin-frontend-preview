'use client';

import { Ban, Receipt as ReceiptIcon, Wallet } from 'lucide-react';
import { useState } from 'react';
import {
  EXPENSE_CATEGORY_AR,
  PAYMENT_METHOD_AR,
  formatLongDateAr,
  formatMoney,
  type ExpenseSummary,
  type ReceiptSummary,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, cn } from '@muhami/ui';
import { PaymentSheet } from './payment-sheet';
import { ReceiptCorrectionSheet } from './receipt-correction-sheet';
import { PrintButton } from '@/components/pdf/print-button';
import { pdfPaths } from '@/lib/api/pdf';
import { ApiError } from '@/lib/api-client';
import { useExpenses, useReceipts } from '@/lib/api/finance';
import { Can, useAuth } from '@/lib/auth-context';
import { ExpenseSheet } from './expense-sheet';

export function ReceiptsList({ caseId, clientId }: { caseId?: string; clientId?: string }) {
  const [payingFor, setPayingFor] = useState<ReceiptSummary | null>(null);
  const [correcting, setCorrecting] = useState<ReceiptSummary | null>(null);
  const query = useReceipts({ caseId, clientId, includeVoided: true });
  const receipts = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        description={query.error instanceof ApiError ? query.error.messageAr : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (receipts.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        title="No receipts"
        description="A receipt appears here when a payment is recorded."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <ul className="divide-y divide-line">
          {receipts.map((receipt) => (
            <ReceiptRow
              key={receipt.id}
              receipt={receipt}
              onPay={() => setPayingFor(receipt)}
              onCorrect={() => setCorrecting(receipt)}
            />
          ))}
        </ul>
      </Card>

      {query.hasNextPage ? (
        <Button
          variant="secondary"
          block
          size="sm"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more
        </Button>
      ) : null}

      {payingFor ? (
        <PaymentSheet
          open={Boolean(payingFor)}
          onOpenChange={(open) => !open && setPayingFor(null)}
          receipt={payingFor}
        />
      ) : null}

      {correcting ? (
        <ReceiptCorrectionSheet
          open={Boolean(correcting)}
          onOpenChange={(open) => !open && setCorrecting(null)}
          receipt={correcting}
        />
      ) : null}
    </div>
  );
}

function ReceiptRow({
  receipt,
  onPay,
  onCorrect,
}: {
  receipt: ReceiptSummary;
  onPay: () => void;
  onCorrect: () => void;
}) {
  const outstanding = BigInt(receipt.outstanding);
  const isVoided = receipt.status === 'VOIDED';

  return (
    <li className="flex items-start gap-3 p-3.5">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ltr-numerals text-sm font-semibold text-ink">
            Receipt {receipt.numberDisplay}
          </span>
          {isVoided ? <Badge tone="danger">Voided</Badge> : null}
          {receipt.isCreditNote ? <Badge tone="info">Correction voucher</Badge> : null}
          {!isVoided && !receipt.isCreditNote && outstanding === 0n ? (
            <Badge tone="success">Settled</Badge>
          ) : null}
        </div>

        <p
          className={cn('truncate text-sm', isVoided ? 'text-ink-subtle line-through' : 'text-ink')}
        >
          {receipt.description}
        </p>

        <p className="text-xs text-ink-subtle">
          {receipt.clientName}
          {receipt.caseNumber ? ` · ${receipt.caseNumber}` : ''} ·{' '}
          {formatLongDateAr(new Date(receipt.issuedAt))}
        </p>

        {receipt.payments.length > 0 ? (
          <p className="ltr-numerals text-xs text-success">
            Received {formatMoney(BigInt(receipt.paidAmount))} ·{' '}
            {PAYMENT_METHOD_AR[receipt.payments[0]!.method]}
          </p>
        ) : null}

        {isVoided && receipt.voidReason ? (
          <p className="flex items-center gap-1 text-xs text-danger">
            <Ban className="size-3" aria-hidden />
            {receipt.voidReason}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="ltr-numerals text-sm font-semibold text-ink">
          {formatMoney(BigInt(receipt.amount))}
        </span>
        {!isVoided && !receipt.isCreditNote && outstanding > 0n ? (
          <>
            <span className="ltr-numerals text-xs text-warning">
              Remaining {formatMoney(outstanding, 'IQD', { withSymbol: false })}
            </span>
            <Can permission="payment:create">
              <Button size="sm" variant="secondary" onClick={onPay}>
                Record payment
              </Button>
            </Can>
          </>
        ) : null}

        <PrintButton
          path={pdfPaths.receipt(receipt.id)}
          label="Print"
          variant="ghost"
          options={isVoided ? { watermark: 'Voided' } : undefined}
        />

        {!isVoided && !receipt.isCreditNote ? (
          <Can permission="invoice:void">
            <button
              type="button"
              onClick={onCorrect}
              className="text-xs text-ink-subtle underline-offset-2 hover:text-danger hover:underline"
            >
              Correct
            </button>
          </Can>
        ) : null}
      </div>
    </li>
  );
}

export function ExpensesList({ caseId }: { caseId?: string }) {
  const query = useExpenses({ caseId });
  const expenses = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No expenses"
        description="Record court fees, expert fees and travel expenses."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <ul className="divide-y divide-line">
          {expenses.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} />
          ))}
        </ul>
      </Card>

      {query.hasNextPage ? (
        <Button
          variant="secondary"
          block
          size="sm"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more
        </Button>
      ) : null}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: ExpenseSummary }) {
  const { can } = useAuth();
  const [editing, setEditing] = useState(false);
  return (
    <li className="flex items-start gap-3 p-3.5">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={expense.category === 'COURT_FEE' ? 'brand' : 'neutral'}>
            {EXPENSE_CATEGORY_AR[expense.category]}
          </Badge>
          {expense.billable ? <Badge tone="info">Charged to client</Badge> : null}
        </div>
        <p className="truncate text-sm text-ink">{expense.description}</p>
        <p className="text-xs text-ink-subtle">
          {formatLongDateAr(new Date(expense.spentAt))}
          {expense.caseNumber ? ` · ${expense.caseNumber}` : ''}
        </p>
      </div>
      <div className="shrink-0 space-y-2 text-end">
        <span className="ltr-numerals block text-sm font-semibold text-ink">
          {formatMoney(BigInt(expense.amount))}
        </span>
        {can('expense:update') ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit expense
          </Button>
        ) : null}
      </div>
      {editing ? (
        <ExpenseSheet
          open={editing}
          onOpenChange={setEditing}
          caseId={expense.caseId ?? undefined}
          expense={expense}
        />
      ) : null}
    </li>
  );
}
