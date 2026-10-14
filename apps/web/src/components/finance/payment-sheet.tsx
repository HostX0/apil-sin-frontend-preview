'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_AR,
  formatMoney,
  toBaghdadDateKey,
  type PaymentMethod,
  type ReceiptSummary,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, cn } from '@muhami/ui';
import { MoneyInput } from '@/components/finance/money-input';
import { ApiError } from '@/lib/api-client';
import { useRecordPayment, newIdempotencyKey } from '@/lib/api/finance';

/**
 * Record a payment against a receipt.
 *
 * The remaining balance is stated at the top and offered as a one-tap default,
 * because "paid in full" is the common case and typing the amount again is
 * where a digit gets dropped.
 */
export function PaymentSheet({
  open,
  onOpenChange,
  receipt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptSummary;
}) {
  const remaining = BigInt(receipt.outstanding);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [paidAt, setPaidAt] = useState(toBaghdadDateKey(new Date()));
  const [reference, setReference] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const record = useRecordPayment();
  const idempotencyKey = useMemo(() => (open ? newIdempotencyKey() : ''), [open]);

  useEffect(() => {
    if (open) return;
    setAmount('');
    setMethod('CASH');
    setPaidAt(toBaghdadDateKey(new Date()));
    setReference('');
    setFormError(null);
    setFieldErrors({});
  }, [open]);

  const submit = async () => {
    setFormError(null);
    setFieldErrors({});

    try {
      await record.mutateAsync({
        invoiceId: receipt.id,
        amount,
        method,
        paidAt,
        reference: reference || undefined,
        idempotencyKey,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setFormError('Could not record the payment. Try again.');
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Record payment"
        description={`Receipt no. ${receipt.numberDisplay} — ${receipt.clientName}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md bg-surface-sunken p-3">
            <span className="text-sm text-ink-muted">Receipt balance</span>
            <span className="ltr-numerals text-base font-semibold text-ink">
              {formatMoney(remaining)}
            </span>
          </div>

          <Field label="Amount received" required error={fieldErrors.amount?.[0]}>
            {(props) => (
              <div className="space-y-2">
                <MoneyInput {...props} value={amount} onChange={setAmount} />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAmount(remaining.toString())}
                >
                  Full amount
                </Button>
              </div>
            )}
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Payment method</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMethod(option)}
                  aria-pressed={method === option}
                  className={cn(
                    'rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                    method === option
                      ? 'border-brand bg-brand-subtle text-brand'
                      : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                  )}
                >
                  {PAYMENT_METHOD_AR[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Payment date" required error={fieldErrors.paidAt?.[0]}>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
              />
            )}
          </Field>

          <Field label="Transfer / reference number">
            {(props) => (
              <Input
                {...props}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Optional"
                dir="ltr"
              />
            )}
          </Field>

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <SheetFooter>
            <Button variant="secondary" block onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              block
              loading={record.isPending}
              disabled={!amount}
              onClick={() => void submit()}
            >
              Record payment
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
