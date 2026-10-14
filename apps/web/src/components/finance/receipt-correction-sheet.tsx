'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatMoney, toBaghdadDateKey, type ReceiptSummary } from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea, cn } from '@muhami/ui';
import { MoneyInput } from '@/components/finance/money-input';
import { ApiError } from '@/lib/api-client';
import { useCreditNote, useVoidReceipt, newIdempotencyKey } from '@/lib/api/finance';

/**
 * Correcting an issued receipt.
 *
 * A receipt is immutable, so there is no "edit" here — only the two lawful
 * corrections. Which one is available is decided by the data, not by the user:
 * once money has been received, voiding would orphan the payment, so a credit
 * note is the only option and the void path is not offered at all.
 */
export function ReceiptCorrectionSheet({
  open,
  onOpenChange,
  receipt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptSummary;
}) {
  const hasPayments = receipt.payments.length > 0;
  const canVoid = !hasPayments;

  const [mode, setMode] = useState<'void' | 'credit'>(canVoid ? 'void' : 'credit');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(receipt.amount);
  const [issuedAt, setIssuedAt] = useState(toBaghdadDateKey(new Date()));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const voidReceipt = useVoidReceipt(receipt.id);
  const creditNote = useCreditNote(receipt.id);
  const idempotencyKey = useMemo(() => (open ? newIdempotencyKey() : ''), [open]);

  useEffect(() => {
    if (open) return;
    setMode(canVoid ? 'void' : 'credit');
    setReason('');
    setAmount(receipt.amount);
    setIssuedAt(toBaghdadDateKey(new Date()));
    setFormError(null);
    setFieldErrors({});
  }, [open, canVoid, receipt.amount]);

  const submit = async () => {
    setFormError(null);
    setFieldErrors({});

    try {
      if (mode === 'void') {
        await voidReceipt.mutateAsync({ reason });
      } else {
        await creditNote.mutateAsync({ amount, reason, issuedAt, idempotencyKey });
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setFormError('Could not apply the correction. Try again.');
      }
    }
  };

  const pending = voidReceipt.isPending || creditNote.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Correct receipt"
        description={`Receipt no. ${receipt.numberDisplay} — ${formatMoney(BigInt(receipt.amount))}`}
      >
        <div className="space-y-4">
          {hasPayments ? (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <p className="text-sm text-ink-muted">
                Payments have been received for this receipt, so it cannot be cancelled. A
                correction voucher will appear in the ledger alongside the original receipt.
              </p>
            </div>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">Correction type</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'void' as const, label: 'Cancel receipt' },
                  { value: 'credit' as const, label: 'Correction voucher' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    aria-pressed={mode === option.value}
                    className={cn(
                      'rounded-md border p-3 text-sm font-medium transition-colors',
                      mode === option.value
                        ? 'border-brand bg-brand-subtle text-brand'
                        : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {mode === 'credit' ? (
            <>
              <Field
                label="Correction amount"
                required
                error={fieldErrors.amount?.[0]}
                hint="This may be lower than the receipt amount for a partial correction."
              >
                {(props) => <MoneyInput {...props} value={amount} onChange={setAmount} />}
              </Field>

              <Field label="Voucher date" required error={fieldErrors.issuedAt?.[0]}>
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    value={issuedAt}
                    onChange={(event) => setIssuedAt(event.target.value)}
                  />
                )}
              </Field>
            </>
          ) : null}

          <Field label="Reason" required error={fieldErrors.reason?.[0]}>
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Saved in the ledger and cannot be edited later"
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
              variant="danger"
              block
              loading={pending}
              disabled={!reason || (mode === 'credit' && !amount)}
              onClick={() => void submit()}
            >
              {mode === 'void' ? 'Cancel receipt' : 'Issue correction voucher'}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
