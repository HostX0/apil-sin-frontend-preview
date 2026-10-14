'use client';

import { useEffect, useMemo, useState } from 'react';
import { toBaghdadDateKey } from '@muhami/shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter } from '@muhami/ui';
import { MoneyInput } from '@/components/finance/money-input';
import { ApiError } from '@/lib/api-client';
import { useCaseList } from '@/lib/api/cases';
import { useClientList } from '@/lib/api/clients';
import { useIssueReceipt, newIdempotencyKey } from '@/lib/api/finance';
import { useDebounced } from '@/lib/use-debounced';

/**
 * Issue a receipt.
 *
 * The idempotency key is minted once when the sheet opens and reused for every
 * retry of that submission. That is what makes a dropped connection safe: the
 * retry carries the same key, and the API returns the receipt it already
 * created instead of allocating a second number.
 */
export function ReceiptSheet({
  open,
  onOpenChange,
  caseId,
  clientId,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string;
  clientId?: string;
  onIssued?: (receiptId: string) => void;
}) {
  const [selectedClientId, setSelectedClientId] = useState(clientId ?? '');
  const [selectedCaseId, setSelectedCaseId] = useState(caseId ?? '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [issuedAt, setIssuedAt] = useState(toBaghdadDateKey(new Date()));
  const [clientSearch, setClientSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const issue = useIssueReceipt();

  // Minted per opening, not per submit.
  const idempotencyKey = useMemo(() => (open ? newIdempotencyKey() : ''), [open]);

  const debouncedClientSearch = useDebounced(clientSearch);
  const clients = useClientList({ search: debouncedClientSearch || undefined, sort: 'name' });
  const clientOptions = clients.data?.pages.flatMap((page) => page.items) ?? [];

  // Only the chosen client's cases — a receipt filed against another client's
  // case would corrupt two balances at once, and the API rejects it anyway.
  const cases = useCaseList({ clientId: selectedClientId || undefined, sort: 'activity' });
  const caseOptions = cases.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    if (open) return;
    setSelectedClientId(clientId ?? '');
    setSelectedCaseId(caseId ?? '');
    setAmount('');
    setDescription('');
    setIssuedAt(toBaghdadDateKey(new Date()));
    setClientSearch('');
    setFormError(null);
    setFieldErrors({});
  }, [open, caseId, clientId]);

  const submit = async () => {
    setFormError(null);
    setFieldErrors({});

    try {
      const receipt = await issue.mutateAsync({
        clientId: selectedClientId,
        caseId: selectedCaseId || undefined,
        amount,
        description,
        issuedAt,
        idempotencyKey,
      });
      onIssued?.(receipt.id);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setFormError('Could not issue the receipt. Try again.');
      }
    }
  };

  const canSubmit = Boolean(selectedClientId && amount && description);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="New payment receipt"
        description="The receipt cannot be edited after issue. Correct it by cancelling it or issuing a correction voucher."
      >
        <div className="space-y-4">
          <Field label="Client" required error={fieldErrors.clientId?.[0]}>
            {(props) => (
              <div className="space-y-2">
                {!clientId ? (
                  <Input
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    placeholder="Search for a client"
                    aria-label="Search for a client"
                  />
                ) : null}
                <select
                  {...props}
                  value={selectedClientId}
                  onChange={(event) => {
                    setSelectedClientId(event.target.value);
                    setSelectedCaseId('');
                  }}
                  disabled={Boolean(clientId)}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
                >
                  <option value="">Choose a client…</option>
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Field>

          <Field label="Case (optional)" error={fieldErrors.caseId?.[0]}>
            {(props) => (
              <select
                {...props}
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                disabled={Boolean(caseId) || !selectedClientId}
                className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
              >
                <option value="">No linked case</option>
                {caseOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.numberDisplay} — {item.subject}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Amount" required error={fieldErrors.amount?.[0]}>
            {(props) => <MoneyInput {...props} value={amount} onChange={setAmount} />}
          </Field>

          <Field label="Description" required error={fieldErrors.description?.[0]}>
            {(props) => (
              <Input
                {...props}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Example: Legal fees for the case"
              />
            )}
          </Field>

          <Field label="Issue date" required error={fieldErrors.issuedAt?.[0]}>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
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
              loading={issue.isPending}
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              Issue receipt
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
