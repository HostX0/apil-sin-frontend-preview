'use client';

import { uiEnglish, uiFieldErrors } from '@/lib/ui-english';

import { useRef, useState, type FormEvent } from 'react';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_AR,
  PAYMENT_METHODS,
  PAYMENT_METHOD_AR,
  createFinanceAccountSchema,
  createFinanceMovementSchema,
  updateFinanceAccountSchema,
  voidFinanceMovementSchema,
  formatMoney,
  toBaghdadDateKey,
  type CreateFinanceAccountInput,
  type CreateFinanceMovementInput,
  type FinanceAccountSummary,
  type FinanceMovementSummary,
  type UpdateFinanceAccountInput,
} from '@/lib/ui-shared';
import { Button, Field, Input, SheetFooter, Textarea } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { newIdempotencyKey } from '@/lib/api/finance';
import {
  useCreateFinanceAccount,
  useCreateFinanceMovement,
  useUpdateFinanceAccount,
  useVoidFinanceMovement,
} from '@/lib/api/finance-accounts';
import { useOnline } from '@/lib/offline';
import { MoneyInput } from './money-input';
import type { FinanceContext } from './finance-context-picker';

const selectClass =
  'h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-ink disabled:opacity-50';
const confirmationMessage =
  'Save confirmation was not received. Try again with the same details, or close and review the ledger before recording it again.';

function ambiguous(cause: unknown) {
  return !(cause instanceof ApiError) || cause.status === 0 || cause.status >= 500;
}

function ErrorMessage({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="rounded-lg bg-danger-subtle p-3 text-sm leading-6 text-danger">
      {error}
    </p>
  ) : null;
}

export function FinanceAccountForm({
  context = {},
  account,
  onSaved,
  onClose,
  onBusyChange,
  onUncertainChange,
}: {
  context?: FinanceContext;
  account?: FinanceAccountSummary;
  onSaved: (account: FinanceAccountSummary) => void;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
  onUncertainChange?: (uncertain: boolean) => void;
}) {
  const [title, setTitle] = useState(account?.title ?? context.transactionTitle ?? '');
  const [partyName, setPartyName] = useState(account?.partyName ?? '');
  const [amount, setAmount] = useState(account?.agreed ?? '');
  const [notes, setNotes] = useState(account?.notes ?? '');
  const [dueAt, setDueAt] = useState(
    account?.dueAt ? toBaghdadDateKey(new Date(account.dueAt)) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [uncertain, setUncertain] = useState(false);
  const submitted = useRef<CreateFinanceAccountInput | UpdateFinanceAccountInput | null>(null);
  const key = useRef(newIdempotencyKey());
  const create = useCreateFinanceAccount();
  const update = useUpdateFinanceAccount(account?.id ?? '');
  const mutation = account ? update : create;
  const online = useOnline();
  const locked = mutation.isPending || uncertain;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    setError(null);
    setErrors({});
    if (!online) {
      setError('Connect to the internet to save finance details. Your details remain here.');
      return;
    }
    const raw = { title, partyName, totalAmount: amount, notes, dueAt: dueAt || undefined };
    const parsed = account
      ? updateFinanceAccountSchema.safeParse({ ...raw, version: account.version })
      : createFinanceAccountSchema.safeParse({
          ...raw,
          clientId: context.clientId,
          transactionId: context.transactionId,
          idempotencyKey: key.current,
        });
    if (!parsed.success) {
      setErrors(uiFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    if (!submitted.current) submitted.current = parsed.data;
    onBusyChange(true);
    try {
      const saved = account
        ? await update.mutateAsync(submitted.current as UpdateFinanceAccountInput)
        : await create.mutateAsync(submitted.current as CreateFinanceAccountInput);
      setUncertain(false);
      onUncertainChange?.(false);
      onSaved(saved);
    } catch (cause) {
      const unknown = !account && ambiguous(cause);
      setUncertain(unknown);
      onUncertainChange?.(unknown);
      if (cause instanceof ApiError) setErrors(cause.fieldErrors);
      setError(
        unknown
          ? confirmationMessage
          : cause instanceof ApiError
            ? cause.messageAr
            : 'Could not save the fees.',
      );
      if (!unknown) {
        submitted.current = null;
        key.current = newIdempotencyKey();
      }
    } finally {
      onBusyChange(false);
    }
  };
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {context.clientName || account?.clientName ? (
        <p className="rounded-xl bg-brand-subtle p-3 text-sm text-brand">
          {context.transactionTitle ? `Transaction ${context.transactionTitle} · ` : ''}
          {context.clientName ?? account?.clientName}
        </p>
      ) : null}
      <Field
        label="Financial file title"
        required
        error={errors.title?.[0]}
        hint="A clear name to find later, such as Legal consultation or Transaction follow-up."
      >
        {(props) => (
          <Input
            {...props}
            value={title}
            maxLength={200}
            disabled={locked}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Legal consultation"
          />
        )}
      </Field>
      {!context.clientId && !context.transactionId && !account?.clientId ? (
        <Field
          label="Account holder name (optional)"
          error={errors.partyName?.[0]}
          hint="For independent fees, enter the name to show on the receipt."
        >
          {(props) => (
            <Input
              {...props}
              value={partyName}
              maxLength={200}
              disabled={locked}
              onChange={(event) => setPartyName(event.target.value)}
              placeholder="Enter a name without adding a client to the system"
            />
          )}
        </Field>
      ) : null}
      <Field
        label="Total fees in Iraqi dinars"
        required
        error={errors.totalAmount?.[0]}
        hint="The full agreed amount, rather than the payment received now. Enter zero for an expenses-only file."
      >
        {(props) => <MoneyInput {...props} value={amount} disabled={locked} onChange={setAmount} />}
      </Field>
      {account && amount && BigInt(amount) < BigInt(account.received) ? (
        <p role="alert" className="text-sm text-danger">
          Fees are lower than the amount received. Review payments before changing fees.
        </p>
      ) : null}
      <details
        className="space-y-3 rounded-xl border border-line p-3"
        open={errors.notes || errors.dueAt ? true : undefined}
      >
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Due date and notes (optional)
        </summary>
        <Field label="Payment due date" error={errors.dueAt?.[0]}>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={dueAt}
              disabled={locked}
              onChange={(event) => setDueAt(event.target.value)}
            />
          )}
        </Field>
        <Field label="Agreement details" error={errors.notes?.[0]}>
          {(props) => (
            <Textarea
              {...props}
              value={notes}
              maxLength={2000}
              rows={3}
              disabled={locked}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What do the fees cover? Add any details the office needs."
            />
          )}
        </Field>
      </details>
      <ErrorMessage error={error} />
      <SheetFooter>
        <Button
          type="button"
          variant="secondary"
          block
          disabled={mutation.isPending}
          onClick={onClose}
        >
          {uncertain ? 'Close and review ledger' : 'Cancel'}
        </Button>
        <Button
          type="submit"
          block
          loading={mutation.isPending}
          disabled={
            !title.trim() ||
            amount === '' ||
            Boolean(account && amount && BigInt(amount) < BigInt(account.received))
          }
        >
          {uncertain ? 'Confirm save' : account ? 'Save changes' : 'Save fees'}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function FinanceMovementForm({
  account,
  kind,
  onSaved,
  onClose,
  onBusyChange,
}: {
  account: FinanceAccountSummary;
  kind: 'PAYMENT' | 'EXPENSE';
  onSaved: (account: FinanceAccountSummary) => void;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toBaghdadDateKey(new Date()));
  const [description, setDescription] = useState(
    kind === 'PAYMENT' ? `Fee payment ${account.title}` : '',
  );
  const [method, setMethod] = useState<CreateFinanceMovementInput['method']>('CASH');
  const [category, setCategory] = useState<CreateFinanceMovementInput['category']>('COURT_FEE');
  const [reference, setReference] = useState('');
  const [billable, setBillable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [uncertain, setUncertain] = useState(false);
  const submitted = useRef<CreateFinanceMovementInput | null>(null);
  const key = useRef(newIdempotencyKey());
  const mutation = useCreateFinanceMovement(account.id);
  const online = useOnline();
  const locked = mutation.isPending || uncertain;
  const exceeds =
    kind === 'PAYMENT' && Boolean(amount) && BigInt(amount) > BigInt(account.remaining);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    setError(null);
    setErrors({});
    if (!online) {
      setError('Connect to the internet to record the amount. Your details remain here.');
      return;
    }
    const parsed = createFinanceMovementSchema.safeParse({
      kind,
      amount,
      occurredAt: date,
      description,
      ...(kind === 'PAYMENT' ? { method, reference } : { category, billable }),
      idempotencyKey: key.current,
    });
    if (!parsed.success) {
      setErrors(uiFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    if (!submitted.current) submitted.current = parsed.data;
    onBusyChange(true);
    try {
      const saved = await mutation.mutateAsync(submitted.current);
      setUncertain(false);
      onSaved(saved);
    } catch (cause) {
      const unknown = ambiguous(cause);
      setUncertain(unknown);
      if (cause instanceof ApiError) setErrors(cause.fieldErrors);
      setError(
        unknown
          ? confirmationMessage
          : cause instanceof ApiError
            ? cause.messageAr
            : 'Could not record the amount.',
      );
      if (!unknown) {
        submitted.current = null;
        key.current = newIdempotencyKey();
      }
    } finally {
      onBusyChange(false);
    }
  };
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <p className="rounded-xl bg-surface-sunken p-3 text-sm leading-6 text-ink">
        {account.title}
        <span className="mt-1 block text-ink-muted">
          {account.clientName ?? account.partyName ?? 'Independent account'}
        </span>
        {kind === 'PAYMENT' ? (
          <span className="mt-2 block">
            Remaining: <bdi className="font-semibold">{formatMoney(BigInt(account.remaining))}</bdi>
          </span>
        ) : null}
      </p>
      <Field
        label={`${kind === 'PAYMENT' ? 'Amount received' : 'Expense amount'} in Iraqi dinars`}
        required
        error={
          errors.amount?.[0] ??
          (exceeds
            ? 'The amount exceeds the balance. Review it or update the fees first.'
            : undefined)
        }
      >
        {(props) => <MoneyInput {...props} value={amount} disabled={locked} onChange={setAmount} />}
      </Field>
      {kind === 'PAYMENT' && amount && !exceeds ? (
        <p className="text-sm text-ink-muted">
          Balance after payment:{' '}
          <bdi className="font-semibold text-ink">
            {formatMoney(BigInt(account.remaining) - BigInt(amount))}
          </bdi>
        </p>
      ) : null}
      {kind === 'PAYMENT' ? (
        <Field label="Payment received via" required error={errors.method?.[0]}>
          {(props) => (
            <select
              {...props}
              value={method}
              disabled={locked}
              className={selectClass}
              onChange={(event) =>
                setMethod(event.target.value as CreateFinanceMovementInput['method'])
              }
            >
              {PAYMENT_METHODS.map((option) => (
                <option key={option} value={option}>
                  {PAYMENT_METHOD_AR[option]}
                </option>
              ))}
            </select>
          )}
        </Field>
      ) : (
        <Field label="Expense type" required error={errors.category?.[0]}>
          {(props) => (
            <select
              {...props}
              value={category}
              disabled={locked}
              className={selectClass}
              onChange={(event) =>
                setCategory(event.target.value as CreateFinanceMovementInput['category'])
              }
            >
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {EXPENSE_CATEGORY_AR[option]}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field
        label={kind === 'PAYMENT' ? 'Payment details' : 'What was the amount spent on?'}
        required
        error={errors.description?.[0]}
      >
        {(props) => (
          <Input
            {...props}
            value={description}
            maxLength={300}
            disabled={locked}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={
              kind === 'PAYMENT'
                ? 'Example: First fee payment'
                : 'Example: Certification fees for transaction documents'
            }
          />
        )}
      </Field>
      <Field
        label={kind === 'PAYMENT' ? 'Date received' : 'Expense date'}
        required
        error={errors.occurredAt?.[0]}
      >
        {(props) => (
          <Input
            {...props}
            type="date"
            value={date}
            disabled={locked}
            onChange={(event) => setDate(event.target.value)}
          />
        )}
      </Field>
      {kind === 'PAYMENT' ? (
        <Field label="Transfer or reference number (optional)" error={errors.reference?.[0]}>
          {(props) => (
            <Input
              {...props}
              value={reference}
              maxLength={120}
              disabled={locked}
              onChange={(event) => setReference(event.target.value)}
            />
          )}
        </Field>
      ) : (
        <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-brand"
            checked={billable}
            disabled={locked}
            onChange={(event) => setBillable(event.target.checked)}
          />
          <span>
            Charged to client (for tracking only)
            <span className="mt-1 block text-xs leading-6 text-ink-muted">
              Shown separately from fees. It is not added to the balance or treated as reimbursed.
            </span>
          </span>
        </label>
      )}
      <ErrorMessage error={error} />
      <SheetFooter>
        <Button
          type="button"
          variant="secondary"
          block
          disabled={mutation.isPending}
          onClick={onClose}
        >
          {uncertain ? 'Close and review ledger' : 'Cancel'}
        </Button>
        <Button
          type="submit"
          block
          loading={mutation.isPending}
          disabled={
            !amount || BigInt(amount) <= 0n || (!uncertain && exceeds) || !description.trim()
          }
        >
          {uncertain ? 'Confirm entry' : kind === 'PAYMENT' ? 'Record payment' : 'Record expense'}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function FinanceMovementVoidForm({
  movement,
  onSaved,
  onClose,
  onBusyChange,
}: {
  movement: FinanceMovementSummary;
  onSaved: (account: FinanceAccountSummary) => void;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useVoidFinanceMovement(movement.id);
  const online = useOnline();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = voidFinanceMovementSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(
        uiEnglish(
          parsed.error.issues[0]?.message ?? 'Enter the reason for cancellation.',
          'Enter the reason for cancellation.',
        ),
      );
      return;
    }
    if (!online) {
      setError('Connect to the internet to cancel this entry.');
      return;
    }
    setError(null);
    onBusyChange(true);
    try {
      onSaved(await mutation.mutateAsync(parsed.data));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.messageAr : 'Could not cancel the entry.');
    } finally {
      onBusyChange(false);
    }
  };
  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      <p className="rounded-xl bg-warning-subtle p-3 text-sm leading-7 text-warning">
        The effect of this amount {formatMoney(BigInt(movement.amount))} will be removed from the
        balance. The entry and cancellation reason remain in the ledger.
      </p>
      <p className="text-sm text-ink-muted">{movement.description}</p>
      <Field label="Void reason" required>
        {(props) => (
          <Textarea
            {...props}
            value={reason}
            rows={3}
            maxLength={300}
            disabled={mutation.isPending}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Example: Amount accidentally entered twice"
          />
        )}
      </Field>
      <ErrorMessage error={error} />
      <SheetFooter>
        <Button
          type="button"
          variant="secondary"
          block
          disabled={mutation.isPending}
          onClick={onClose}
        >
          Back
        </Button>
        <Button type="submit" block loading={mutation.isPending} disabled={!reason.trim()}>
          Confirm entry cancellation
        </Button>
      </SheetFooter>
    </form>
  );
}
