'use client';

import { uiEnglish, uiFieldErrors } from '@/lib/ui-english';

import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Plus, Wallet } from 'lucide-react';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_AR,
  formatLongDateAr,
  formatMoney,
  toBaghdadDateKey,
  recordCasePaymentSchema,
  setCaseFeeSchema,
  type CaseFeeSummary,
  type RecordCasePaymentInput,
} from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  Skeleton,
  Textarea,
} from '@muhami/ui';
import { FeeAgreementCard } from '@/components/finance/fee-agreement-card';
import { ExpenseSheet } from './expense-sheet';
import { ExpensesList, ReceiptsList } from './finance-ledger-lists';
import { MoneyInput } from '@/components/finance/money-input';
import { PrintButton } from '@/components/pdf/print-button';
import { ApiError } from '@/lib/api-client';
import {
  newIdempotencyKey,
  useCaseFees,
  useRecordCasePayment,
  useSetCaseFee,
} from '@/lib/api/finance';
import { pdfPaths } from '@/lib/api/pdf';
import { useAuth } from '@/lib/auth-context';
import { useOnline } from '@/lib/offline';

export function CaseFeePanel({
  caseId,
  initialAction,
  onBusyChange,
}: {
  caseId: string;
  initialAction?: 'fee' | 'payment' | 'expense';
  onBusyChange?: (busy: boolean) => void;
}) {
  const { can } = useAuth();
  const allowed = can('finance:read.summary') && can('feeagreement:read') && can('payment:read');
  const query = useCaseFees(caseId, allowed);
  const [feeOpen, setFeeOpen] = useState(initialAction === 'fee');
  const [paymentOpen, setPaymentOpen] = useState(initialAction === 'payment');
  const [expenseOpen, setExpenseOpen] = useState(initialAction === 'expense');
  const [feeBusy, setFeeBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [expenseBusy, setExpenseBusy] = useState(false);
  useEffect(() => {
    onBusyChange?.(feeBusy || paymentBusy || expenseBusy);
    return () => onBusyChange?.(false);
  }, [feeBusy, paymentBusy, expenseBusy, onBusyChange]);
  if (!allowed)
    return (
      <EmptyState
        icon={Wallet}
        title="Case finance unavailable"
        description="You need permission to view fees and payments."
      />
    );
  if (query.isLoading) return <Skeleton className="h-60" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const summary = query.data;
  if (!summary) return null;
  return (
    <div className="space-y-4">
      <FeeTotals summary={summary} />
      {!summary.hasAgreement ? (
        <p className="rounded-xl bg-brand-subtle p-3 text-sm leading-7 text-brand">
          Start by adding the agreed fees, then record each payment received from the client. The
          balance is calculated automatically.
        </p>
      ) : null}
      {summary.hasUnpricedAgreement ? (
        <p className="rounded-md bg-warning-subtle p-3 text-sm text-warning">
          A percentage fee agreement has no amount set; the balance covers fixed fees only.
        </p>
      ) : null}
      {BigInt(summary.overpaid) > 0n ? (
        <p className="rounded-md bg-warning-subtle p-3 text-sm text-warning">
          The amount received exceeds the recorded fees by {formatMoney(BigInt(summary.overpaid))}.
          Review fees and payments.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {can('feeagreement:create') &&
        can('feeagreement:update') &&
        (!summary.hasAgreement || summary.editableAgreement) ? (
          <Button variant="secondary" onClick={() => setFeeOpen(true)}>
            {summary.hasAgreement ? 'Edit fees' : 'Add case fees'}
          </Button>
        ) : null}
        {can('payment:create') && can('invoice:create') ? (
          <Button
            onClick={() => setPaymentOpen(true)}
            disabled={BigInt(summary.remaining) <= 0n || summary.hasUnpricedAgreement}
          >
            <Plus className="size-4" aria-hidden />
            Record payment
          </Button>
        ) : null}
      </div>
      {summary.hasAgreement &&
      !summary.hasUnpricedAgreement &&
      BigInt(summary.remaining) === 0n &&
      BigInt(summary.overpaid) === 0n ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          No balance remains for this client’s case.
        </p>
      ) : null}
      <section className="space-y-2">
        <h3 className="font-semibold text-ink">Payment details</h3>
        {summary.payments.length === 0 ? (
          <Card className="p-5 text-center text-sm text-ink-muted">
            No payments have been recorded for this case yet.
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {summary.payments.map((payment) => (
                <li key={payment.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="ltr-numerals font-semibold text-success">
                      {formatMoney(BigInt(payment.amount))}
                    </span>
                    <Badge tone="neutral">{PAYMENT_METHOD_AR[payment.method]}</Badge>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {formatLongDateAr(new Date(payment.paidAt))}
                    {payment.receivedBy ? ` · received by ${payment.receivedBy}` : ''}
                  </p>
                  {payment.reference ? (
                    <p className="text-xs text-ink-muted">
                      Reference: <bdi>{payment.reference}</bdi>
                    </p>
                  ) : null}
                  {payment.notes ? (
                    <p className="whitespace-pre-wrap text-sm text-ink-muted">{payment.notes}</p>
                  ) : null}
                  {can('pdf:generate') && can('invoice:read') ? (
                    <PrintButton
                      path={pdfPaths.receipt(payment.invoiceId)}
                      label={`Payment receipt ${payment.receiptNumber}`}
                      variant="ghost"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
      {can('expense:read') || can('expense:create') ? (
        <section className="space-y-3 rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-ink">Case expenses</h3>
            {can('expense:create') ? (
              <Button variant="secondary" size="sm" onClick={() => setExpenseOpen(true)}>
                <Plus className="size-4" aria-hidden />
                Record an expense
              </Button>
            ) : null}
          </div>
          <p className="text-xs leading-6 text-ink-muted">
            Fees, travel and other expenses. Client expenses are shown separately and are not added
            to fees automatically.
          </p>
          {can('expense:read') ? <ExpensesList caseId={caseId} /> : null}
        </section>
      ) : null}
      {can('invoice:read') && summary.payments.length > 0 ? (
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Receipts and payment corrections
          </summary>
          <div className="mt-3">
            <ReceiptsList caseId={caseId} />
          </div>
        </details>
      ) : null}
      <ExpenseSheet
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        caseId={caseId}
        onBusyChange={setExpenseBusy}
      />
      {summary.hasAgreement && !summary.editableAgreement ? (
        <details className="rounded-md border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Detailed fee agreements
          </summary>
          <div className="mt-3">
            <FeeAgreementCard caseId={caseId} />
          </div>
        </details>
      ) : null}
      <Sheet
        open={feeOpen}
        onOpenChange={(open) => {
          if (!feeBusy) setFeeOpen(open);
        }}
      >
        <SheetContent title="Agreed fees">
          {feeOpen ? (
            <FeeForm
              summary={summary}
              onClose={() => setFeeOpen(false)}
              onBusyChange={setFeeBusy}
            />
          ) : null}
        </SheetContent>
      </Sheet>
      <Sheet
        open={paymentOpen}
        onOpenChange={(open) => {
          if (!paymentBusy) setPaymentOpen(open);
        }}
      >
        <SheetContent
          title="Record payment"
          description={`${summary.caseNumber} · ${summary.clientName}`}
        >
          {paymentOpen ? (
            <CasePaymentForm
              summary={summary}
              onClose={() => setPaymentOpen(false)}
              onBusyChange={setPaymentBusy}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function FeeTotals({
  summary,
}: {
  summary: Pick<CaseFeeSummary, 'agreed' | 'received' | 'remaining'>;
}) {
  const agreed = BigInt(summary.agreed);
  const received = BigInt(summary.received);
  const progress = agreed > 0n ? Math.min(100, Number((received * 1000n) / agreed) / 10) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { title: 'Agreed fees', amount: summary.agreed, tone: 'text-ink' },
          { title: 'Amount received', amount: summary.received, tone: 'text-success' },
          {
            title: 'Remaining balance',
            amount: summary.remaining,
            tone: BigInt(summary.remaining) > 0n ? 'text-warning' : 'text-success',
          },
        ].map((tile) => (
          <Card key={tile.title} className="p-4">
            <p className="text-xs text-ink-muted">{tile.title}</p>
            <p className={`ltr-numerals mt-2 text-xl font-bold ${tile.tone}`}>
              {formatMoney(BigInt(tile.amount))}
            </p>
          </Card>
        ))}
      </div>
      {progress !== null ? (
        <div className="space-y-2 rounded-xl bg-surface-sunken p-3">
          <div className="flex flex-wrap justify-between gap-2 text-xs text-ink-muted">
            <span>Fees collected</span>
            <span className="font-semibold text-success">
              {new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(progress)}%
            </span>
          </div>
          <progress
            className="block h-2.5 w-full accent-success"
            max={100}
            value={progress}
            aria-label={`Fees received: ${formatMoney(received)} of ${formatMoney(agreed)}`}
          />
        </div>
      ) : null}
    </div>
  );
}

function FeeForm({
  summary,
  onClose,
  onBusyChange,
}: {
  summary: CaseFeeSummary;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [amount, setAmount] = useState(summary.hasAgreement ? summary.agreed : '');
  const [error, setError] = useState<string | null>(null);
  const mutation = useSetCaseFee(summary.caseId);
  const online = useOnline();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    setError(null);
    if (!online) {
      setError(
        'You are offline. Your fee details are kept here so you can save them when you reconnect.',
      );
      return;
    }
    const input = setCaseFeeSchema.safeParse({
      totalAmount: amount,
      agreementId: summary.editableAgreement?.id,
      version: summary.editableAgreement?.version,
    });
    if (!input.success) {
      setError(
        uiEnglish(input.error.issues[0]?.message ?? 'Check the amount.', 'Check the amount.'),
      );
      return;
    }
    onBusyChange(true);
    try {
      await mutation.mutateAsync(input.data);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? (cause.fieldErrors.totalAmount?.[0] ?? cause.messageAr)
          : 'Could not save the fees.',
      );
    } finally {
      onBusyChange(false);
    }
  };
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <Field label="Total case fees in Iraqi dinars" required>
        {(props) => (
          <MoneyInput
            {...props}
            value={amount}
            onChange={setAmount}
            disabled={mutation.isPending}
          />
        )}
      </Field>
      <p className="text-sm text-ink-muted">
        The full amount agreed with the client, even if paid in installments.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <SheetFooter>
        <Button
          type="button"
          variant="secondary"
          block
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" block loading={mutation.isPending} disabled={amount === ''}>
          Save fees
        </Button>
      </SheetFooter>
    </form>
  );
}

function CasePaymentForm({
  summary,
  onClose,
  onBusyChange,
}: {
  summary: CaseFeeSummary;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [values, setValues] = useState<RecordCasePaymentInput>(() => ({
    amount: '',
    method: 'CASH',
    paidAt: toBaghdadDateKey(new Date()),
    idempotencyKey: newIdempotencyKey(),
    reference: '',
    notes: '',
  }));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const mutation = useRecordCasePayment(summary.caseId);
  const online = useOnline();
  const amount = values.amount ? BigInt(values.amount) : 0n;
  const remaining = BigInt(summary.remaining);
  const exceedsRemaining = amount > remaining;
  const change = <K extends keyof RecordCasePaymentInput>(
    key: K,
    value: RecordCasePaymentInput[K],
  ) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    setError(null);
    setErrors({});
    if (!online) {
      setError(
        'You are offline. Your payment details are kept here so you can save them when you reconnect.',
      );
      return;
    }
    const parsed = recordCasePaymentSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(uiFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    onBusyChange(true);
    try {
      await mutation.mutateAsync(parsed.data);
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.fieldErrors);
        setError(cause.messageAr);
      } else setError('Could not record the payment.');
    } finally {
      onBusyChange(false);
    }
  };
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <p className="rounded-md bg-surface-sunken p-3 text-sm">
        Remaining: <bdi className="font-semibold">{formatMoney(BigInt(summary.remaining))}</bdi>
      </p>
      <Field
        label="Amount received in Iraqi dinars"
        required
        error={
          errors.amount?.[0] ??
          (exceedsRemaining
            ? 'The amount exceeds the balance. Review it or update the fees first.'
            : undefined)
        }
      >
        {(props) => (
          <MoneyInput
            {...props}
            value={values.amount}
            onChange={(amount) => change('amount', amount)}
            disabled={mutation.isPending}
          />
        )}
      </Field>
      {amount > 0n && !exceedsRemaining ? (
        <p className="text-sm text-ink-muted">
          Balance after this payment:{' '}
          <bdi className="font-semibold text-ink">{formatMoney(remaining - amount)}</bdi>
        </p>
      ) : null}
      <Field label="Payment method" required>
        {(props) => (
          <select
            {...props}
            className="h-11 w-full rounded-md border border-line-strong bg-surface px-3"
            value={values.method}
            disabled={mutation.isPending}
            onChange={(event) =>
              change('method', event.target.value as RecordCasePaymentInput['method'])
            }
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_AR[method]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Payment date" required error={errors.paidAt?.[0]}>
        {(props) => (
          <Input
            {...props}
            type="date"
            value={values.paidAt}
            disabled={mutation.isPending}
            onChange={(event) => change('paidAt', event.target.value)}
          />
        )}
      </Field>
      <details className="space-y-3 rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Notes and transfer reference (optional)
        </summary>
        <Field label="Transfer or reference number">
          {(props) => (
            <Input
              {...props}
              value={values.reference ?? ''}
              disabled={mutation.isPending}
              onChange={(event) => change('reference', event.target.value)}
            />
          )}
        </Field>
        <Field label="Payment notes">
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              value={values.notes ?? ''}
              disabled={mutation.isPending}
              onChange={(event) => change('notes', event.target.value)}
            />
          )}
        </Field>
      </details>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <SheetFooter>
        <Button
          type="button"
          variant="secondary"
          block
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          block
          loading={mutation.isPending}
          disabled={amount <= 0n || exceedsRemaining}
        >
          Record payment
        </Button>
      </SheetFooter>
    </form>
  );
}
