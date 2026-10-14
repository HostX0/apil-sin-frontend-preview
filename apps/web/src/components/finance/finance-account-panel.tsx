'use client';

import { useEffect, useState } from 'react';
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Coins,
  FileText,
  Plus,
  Receipt,
  Wallet,
} from 'lucide-react';
import {
  EXPENSE_CATEGORY_AR,
  PAYMENT_METHOD_AR,
  formatLongDateAr,
  formatMoney,
  type FinanceAccountSummary,
  type FinanceMovementSummary,
} from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Sheet,
  SheetContent,
  Skeleton,
  cn,
} from '@muhami/ui';
import { PrintButton } from '@/components/pdf/print-button';
import { useFinanceAccount, useFinanceAccounts } from '@/lib/api/finance-accounts';
import { useAuth } from '@/lib/auth-context';
import { FeeTotals } from './case-fee-panel';
import {
  FinanceAccountForm,
  FinanceMovementForm,
  FinanceMovementVoidForm,
} from './finance-account-forms';
import { FinanceContextPicker, type FinanceContext } from './finance-context-picker';

export function FinanceAccountPanel({
  accountId,
  initialAction,
  onBusyChange,
}: {
  accountId: string;
  initialAction?: 'fee' | 'payment' | 'expense';
  onBusyChange?: (busy: boolean) => void;
}) {
  const { can } = useAuth();
  const allowed =
    can('finance:read.summary') &&
    can('feeagreement:read') &&
    can('payment:read') &&
    can('expense:read');
  const query = useFinanceAccount(accountId, allowed);
  const [action, setAction] = useState<'fee' | 'payment' | 'expense' | null>(initialAction ?? null);
  const [voiding, setVoiding] = useState<FinanceMovementSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  if (!allowed)
    return (
      <EmptyState
        icon={Wallet}
        title="Finance is unavailable for your account"
        description="Ask the office administrator for access to fees and payments."
      />
    );
  if (query.isLoading) return <Skeleton className="h-56" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const account = query.data;
  if (!account) return null;
  const canPay = can('payment:create') && can('invoice:create');
  const saved = (updated: FinanceAccountSummary) => {
    const newPayment = updated.movements.find(
      (movement) =>
        movement.kind === 'PAYMENT' && !account.movements.some((old) => old.id === movement.id),
    );
    setNotice(
      voiding
        ? 'Entry cancelled and balance updated.'
        : action === 'payment'
          ? `Payment recorded${newPayment?.receiptNumber ? `, receipt no. ${newPayment.receiptNumber}` : ''}.`
          : action === 'expense'
            ? 'Expense recorded and summary updated.'
            : 'Fees saved.',
    );
    setBusy(false);
    setAction(null);
    setVoiding(null);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{account.title}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {account.clientName ?? account.partyName ?? 'Independent account'}
            {account.transactionType ? ` · transaction ${account.transactionType}` : ''}
          </p>
        </div>
        <Badge tone="neutral">
          {account.transactionId ? 'Transaction' : account.clientId ? 'Client' : 'Independent'}
        </Badge>
      </div>
      {notice ? (
        <p
          role="status"
          className="flex gap-2 rounded-xl bg-success-subtle p-3 text-sm text-success"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {notice}
        </p>
      ) : null}
      <FeeTotals summary={account} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Card className="p-3">
          <p className="text-xs text-ink-muted">Recorded expenses</p>
          <p className="ltr-numerals mt-1 font-semibold text-ink">
            {formatMoney(BigInt(account.expenses))}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-ink-muted">Client expenses — for tracking</p>
          <p className="ltr-numerals mt-1 font-semibold text-ink">
            {formatMoney(BigInt(account.billableExpenses))}
          </p>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        {canPay ? (
          <Button onClick={() => setAction('payment')} disabled={BigInt(account.remaining) <= 0n}>
            <Receipt className="size-4" aria-hidden />
            Record payment
          </Button>
        ) : null}
        {can('expense:create') ? (
          <Button variant="secondary" onClick={() => setAction('expense')}>
            <Wallet className="size-4" aria-hidden />
            Record an expense
          </Button>
        ) : null}
        {can('feeagreement:update') ? (
          <Button variant="ghost" onClick={() => setAction('fee')}>
            Edit fees
          </Button>
        ) : null}
        <PrintButton
          path={`/pdf/finance-accounts/${account.id}/statement`}
          label="Account statement"
        />
      </div>
      {account.dueAt ? (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <CalendarClock className="size-4" aria-hidden />
          Payment due: {formatLongDateAr(new Date(account.dueAt))}
        </p>
      ) : null}
      {account.notes ? (
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Agreement details
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-muted">
            {account.notes}
          </p>
        </details>
      ) : null}
      <section className="space-y-3">
        <h4 className="font-semibold text-ink">Payments and expenses</h4>
        {account.movements.length ? (
          <Card>
            <ul className="divide-y divide-line">
              {account.movements.map((movement) => (
                <FinanceMovementRow
                  key={movement.id}
                  movement={movement}
                  onVoid={() => setVoiding(movement)}
                />
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState
            icon={Coins}
            title="No amounts recorded yet"
            description="Record a payment when receiving money, or an expense when paying fees or costs for this file."
          />
        )}
      </section>
      <Sheet
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open && !busy) setAction(null);
        }}
      >
        <SheetContent
          title={
            action === 'fee'
              ? 'Edit fees'
              : action === 'payment'
                ? 'Record payment'
                : 'Record an expense'
          }
          description={account.title}
        >
          {action === 'fee' ? (
            <FinanceAccountForm
              key={`fee-${account.id}`}
              account={account}
              onSaved={saved}
              onClose={() => {
                setAction(null);
                void query.refetch();
              }}
              onBusyChange={setBusy}
            />
          ) : action ? (
            <FinanceMovementForm
              key={`${action}-${account.id}`}
              account={account}
              kind={action === 'payment' ? 'PAYMENT' : 'EXPENSE'}
              onSaved={saved}
              onClose={() => {
                setAction(null);
                void query.refetch();
              }}
              onBusyChange={setBusy}
            />
          ) : null}
        </SheetContent>
      </Sheet>
      <Sheet
        open={Boolean(voiding)}
        onOpenChange={(open) => {
          if (!open && !busy) setVoiding(null);
        }}
      >
        <SheetContent
          title="Cancel financial entry"
          description="Cancel the amount while keeping a clear record of the reason."
        >
          {voiding ? (
            <FinanceMovementVoidForm
              key={voiding.id}
              movement={voiding}
              onSaved={saved}
              onClose={() => setVoiding(null)}
              onBusyChange={setBusy}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function FinanceMovementRow({
  movement,
  fileTitle,
  onVoid,
}: {
  movement: FinanceMovementSummary;
  fileTitle?: string;
  onVoid?: () => void;
}) {
  const { can } = useAuth();
  const payment = movement.kind === 'PAYMENT';
  const canVoid = payment ? can('invoice:void') : can('expense:delete');
  return (
    <li className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={movement.voidedAt ? 'danger' : payment ? 'success' : 'neutral'}>
            {movement.voidedAt ? 'Voided' : payment ? 'Payment received' : 'Expense'}
          </Badge>
          {movement.receiptNumber ? (
            <span className="text-xs text-ink-muted">
              Receipt <bdi>{movement.receiptNumber}</bdi>
            </span>
          ) : null}
        </div>
        <bdi
          className={cn(
            'font-semibold',
            movement.voidedAt
              ? 'text-ink-subtle line-through'
              : payment
                ? 'text-success'
                : 'text-ink',
          )}
        >
          {formatMoney(BigInt(movement.amount))}
        </bdi>
      </div>
      <p className={cn('text-sm text-ink', movement.voidedAt && 'line-through')}>
        {movement.description}
      </p>
      {fileTitle ? <p className="text-xs font-medium text-brand">{fileTitle}</p> : null}
      <p className="text-xs leading-6 text-ink-muted">
        {formatLongDateAr(new Date(movement.occurredAt))}
        {movement.method ? ` · ${PAYMENT_METHOD_AR[movement.method]}` : ''}
        {movement.category ? ` · ${EXPENSE_CATEGORY_AR[movement.category]}` : ''}
        {movement.recordedBy ? ` · ${movement.recordedBy}` : ''}
      </p>
      {movement.reference ? (
        <p className="text-xs text-ink-muted">
          Reference: <bdi>{movement.reference}</bdi>
        </p>
      ) : null}
      {movement.billable ? <Badge tone="info">Charged to client — for tracking only</Badge> : null}
      {movement.voidedAt ? (
        <p className="flex gap-1 text-xs leading-6 text-danger">
          <Ban className="mt-1 size-3 shrink-0" aria-hidden />
          Cancelled on {formatLongDateAr(new Date(movement.voidedAt))}: {movement.voidReason}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {payment ? (
          <PrintButton
            path={`/pdf/finance-movements/${movement.id}/receipt`}
            label="Payment receipt"
            variant="ghost"
            options={movement.voidedAt ? { watermark: 'Voided' } : undefined}
          />
        ) : null}
        {!movement.voidedAt && canVoid && onVoid ? (
          <Button size="sm" variant="ghost" onClick={onVoid}>
            Cancel entry
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function FinanceAccountCreateSheet({
  open,
  onOpenChange,
  context = {},
  onCreated,
  initialMode = 'independent',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: FinanceContext;
  onCreated?: (account: FinanceAccountSummary, created?: boolean) => void;
  initialMode?: 'independent' | 'client' | 'transaction';
}) {
  const { can } = useAuth();
  const fixed = Boolean(context.clientId || context.transactionId);
  const [mode, setMode] = useState<'independent' | 'client' | 'transaction'>(initialMode);
  const [selected, setSelected] = useState<FinanceContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const ready = fixed || mode === 'independent' || Boolean(selected);
  const chosen = fixed ? context : mode === 'independent' ? {} : (selected ?? {});
  const existingTransaction = useFinanceAccounts(
    { transactionId: chosen.transactionId },
    open && Boolean(chosen.transactionId),
  );
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (busy) return;
        if (!value) {
          setMode(initialMode);
          setSelected(null);
          setUncertain(false);
        }
        onOpenChange(value);
      }}
    >
      <SheetContent
        title="Add fees"
        description="Start with the agreement, then record payments and expenses in the same file."
      >
        {open ? (
          <div className="space-y-4">
            {!fixed ? (
              <>
                <fieldset disabled={busy || uncertain}>
                  <legend className="mb-2 text-sm font-medium text-ink">
                    What are the fees for?
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['independent', 'Independent account'],
                        ...(can('client:read.all') ? [['client', 'Existing client']] : []),
                        ...(can('transaction:read') ? [['transaction', 'Transaction']] : []),
                      ] as Array<['independent' | 'client' | 'transaction', string]>
                    ).map(([option, label]) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={mode === option}
                        disabled={busy || uncertain}
                        onClick={() => {
                          setMode(option);
                          setSelected(null);
                        }}
                        className={cn(
                          'min-h-12 rounded-xl border px-2 py-2 text-sm font-medium',
                          mode === option
                            ? 'border-brand bg-brand-subtle text-brand'
                            : 'border-line text-ink-muted',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {mode === 'independent' ? (
                  <p className="text-sm leading-6 text-ink-muted">
                    Record a consultation or separate fees without adding a client or case. They
                    appear here only.
                  </p>
                ) : (
                  <FinanceContextPicker
                    key={mode}
                    mode={mode}
                    selected={selected}
                    disabled={busy || uncertain}
                    onSelect={setSelected}
                  />
                )}
              </>
            ) : null}
            {chosen.transactionId && existingTransaction.isLoading ? (
              <Skeleton className="h-32" />
            ) : chosen.transactionId && existingTransaction.isError ? (
              <ErrorState onRetry={() => void existingTransaction.refetch()} />
            ) : chosen.transactionId && existingTransaction.data?.[0] ? (
              <Card className="space-y-3 p-4">
                <p className="text-sm leading-7 text-ink">
                  Fees already exist for this transaction. Open its file to edit the agreement or
                  record a payment.
                </p>
                <Button
                  block
                  type="button"
                  onClick={() => {
                    const account = existingTransaction.data[0]!;
                    onOpenChange(false);
                    onCreated?.(account, false);
                  }}
                >
                  Open transaction finance
                </Button>
              </Card>
            ) : ready ? (
              <FinanceAccountForm
                key={`${mode}-${chosen.clientId ?? ''}-${chosen.transactionId ?? ''}`}
                context={chosen}
                onBusyChange={setBusy}
                onUncertainChange={setUncertain}
                onClose={() => {
                  setMode(initialMode);
                  setSelected(null);
                  setUncertain(false);
                  onOpenChange(false);
                }}
                onSaved={(account) => {
                  setBusy(false);
                  setUncertain(false);
                  setMode(initialMode);
                  setSelected(null);
                  onOpenChange(false);
                  onCreated?.(account, true);
                }}
              />
            ) : (
              <p className="rounded-xl bg-surface-sunken p-3 text-sm text-ink-muted">
                Choose {mode === 'client' ? 'Client' : 'the transaction'} above, then set the fees.
              </p>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function AccountFinanceSection({
  clientId,
  transactionId,
  transactionTitle,
  clientName,
}: FinanceContext) {
  const { can } = useAuth();
  const allowed =
    can('finance:read.summary') &&
    can('feeagreement:read') &&
    can('payment:read') &&
    can('expense:read');
  const query = useFinanceAccounts({ clientId, transactionId }, allowed);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  if (!allowed) return null;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">
          {transactionId ? 'Transaction finance' : 'Additional client fees'}
        </h3>
        {can('feeagreement:create') &&
        (!transactionId || !query.data?.length) &&
        !query.isLoading &&
        !query.isError ? (
          <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add fees
          </Button>
        ) : null}
      </div>
      {query.isLoading ? (
        <Skeleton className="h-28" />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.length ? (
        query.data.map((account) => (
          <Card key={account.id} className="overflow-hidden">
            {transactionId || selected === account.id ? (
              <div className="p-4">
                <FinanceAccountPanel accountId={account.id} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSelected(account.id)}
                className="flex min-h-20 w-full items-center justify-between gap-3 p-4 text-start"
              >
                <span>
                  <span className="block font-semibold text-ink">{account.title}</span>
                  <span className="mt-1 block text-xs text-brand">View payments and expenses</span>
                </span>
                <span className="text-xs text-ink-muted">
                  Remaining{' '}
                  <bdi className="block font-semibold text-ink">
                    {formatMoney(BigInt(account.remaining))}
                  </bdi>
                </span>
              </button>
            )}
          </Card>
        ))
      ) : (
        <Card className="p-5">
          <p className="flex items-center gap-2 font-medium text-ink">
            <FileText className="size-4" aria-hidden />
            No fees set for {transactionId ? 'the transaction' : 'additional services'} yet
          </p>
          <p className="mt-2 text-sm leading-7 text-ink-muted">
            Record the agreed fees, then record each payment or expense here.{' '}
            {transactionId
              ? 'Also appears in office finance.'
              : 'Linked case fees appear in their own section.'}
          </p>
        </Card>
      )}
      <FinanceAccountCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        context={{ clientId, transactionId, transactionTitle, clientName }}
        onCreated={(account) => setSelected(account.id)}
      />
    </section>
  );
}
