'use client';

import { uiFieldErrors } from '@/lib/ui-english';

import { useEffect, useState } from 'react';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_AR,
  createExpenseSchema,
  toBaghdadDateKey,
  type ExpenseCategory,
  type ExpenseSummary,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, cn } from '@muhami/ui';
import { MoneyInput } from '@/components/finance/money-input';
import { ApiError } from '@/lib/api-client';
import { useOnline } from '@/lib/offline';
import { newIdempotencyKey, useCreateExpense, useUpdateExpense } from '@/lib/api/finance';

export function ExpenseSheet({
  open,
  onOpenChange,
  caseId,
  onBusyChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string;
  onBusyChange?: (busy: boolean) => void;
  expense?: ExpenseSummary;
}) {
  // Court fees are the most frequently recorded expense in an Iraqi practice,
  // so they are the default rather than an alphabetical first option.
  const [category, setCategory] = useState<ExpenseCategory>(caseId ? 'COURT_FEE' : 'OTHER');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [spentAt, setSpentAt] = useState(toBaghdadDateKey(new Date()));
  const [billable, setBillable] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const create = useCreateExpense();
  const update = useUpdateExpense(expense?.id);
  const busy = create.isPending || update.isPending;
  const online = useOnline();
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [retryLocked, setRetryLocked] = useState(false);

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (open && expense) {
      setCategory(expense.category);
      setAmount(expense.amount);
      setDescription(expense.description);
      setSpentAt(toBaghdadDateKey(new Date(expense.spentAt)));
      setBillable(expense.billable);
    }
  }, [open, expense]);

  useEffect(() => {
    if (open) return;
    setIdempotencyKey(newIdempotencyKey());
    setRetryLocked(false);
    setCategory(caseId ? 'COURT_FEE' : 'OTHER');
    setAmount('');
    setDescription('');
    setSpentAt(toBaghdadDateKey(new Date()));
    setBillable(false);
    setFormError(null);
    setFieldErrors({});
  }, [open, caseId]);

  const submit = async () => {
    if (busy) return;
    setFormError(null);
    setFieldErrors({});
    if (!online) {
      setFormError(
        'Connect to the internet to record the expense. Your details remain in this window.',
      );
      return;
    }
    const parsed = createExpenseSchema.safeParse({
      caseId,
      category,
      amount,
      spentAt,
      description,
      billable: Boolean(caseId) && billable,
      idempotencyKey,
    });
    if (!parsed.success) {
      setFieldErrors(uiFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    try {
      if (expense) await update.mutateAsync({ ...parsed.data, version: expense.version });
      else await create.mutateAsync(parsed.data);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 0 || error.status >= 500) setRetryLocked(true);
        setFieldErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setRetryLocked(true);
        setFormError(
          'The save result is uncertain. Try again with the same details; the system will check for duplicates.',
        );
      }
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <SheetContent
        title={expense ? 'Edit expense' : caseId ? 'Case expense' : 'Office expense'}
        description={
          caseId
            ? 'An expense linked to this case and shown in Finance.'
            : 'A general expense such as rent or supplies, without a client or case.'
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="space-y-4"
          noValidate
        >
          <fieldset disabled={busy || retryLocked} className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">Expense type</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {EXPENSE_CATEGORIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCategory(option)}
                    aria-pressed={category === option}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                      category === option
                        ? 'border-brand bg-brand-subtle text-brand'
                        : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                    )}
                  >
                    {EXPENSE_CATEGORY_AR[option]}
                  </button>
                ))}
              </div>
            </fieldset>

            <Field label="Amount in Iraqi dinars" required error={fieldErrors.amount?.[0]}>
              {(props) => <MoneyInput {...props} value={amount} onChange={setAmount} />}
            </Field>

            <Field label="Description" required error={fieldErrors.description?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Example: Case registration fees"
                />
              )}
            </Field>

            <Field label="Expense date" required error={fieldErrors.spentAt?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={spentAt}
                  onChange={(event) => setSpentAt(event.target.value)}
                />
              )}
            </Field>

            {caseId ? (
              <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={billable}
                  onChange={(event) => setBillable(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
                />
                <span>
                  Paid by the client
                  <span className="block text-xs text-ink-subtle">
                    For tracking only; this is not added to fees automatically and does not mean it
                    has been reimbursed.
                  </span>
                </span>
              </label>
            ) : null}
          </fieldset>

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          {retryLocked ? (
            <p role="status" className="rounded-md bg-warning-subtle p-3 text-sm text-warning">
              The details are locked because the save result is uncertain. Select Retry save to
              check without duplicating the expense, or close this window and review the ledger.
            </p>
          ) : null}
          <SheetFooter>
            <Button
              type="button"
              variant="secondary"
              block
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" block loading={busy} disabled={!amount || !description}>
              {retryLocked ? 'Retry save' : expense ? 'Save changes' : 'Save expense'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
