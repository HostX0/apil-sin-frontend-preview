'use client';

import { FileSignature, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  FEE_MODELS,
  FEE_MODEL_AR,
  formatLongDateAr,
  formatMoney,
  type FeeInstallmentInput,
  type FeeModel,
} from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  Skeleton,
  cn,
} from '@muhami/ui';
import { MoneyInput } from '@/components/finance/money-input';
import { ApiError } from '@/lib/api-client';
import { useCreateFeeAgreement, useFeeAgreements } from '@/lib/api/finance';
import { Can } from '@/lib/auth-context';

/**
 * Fee agreement — عقد أتعاب.
 *
 * Recording one clears the «لا يوجد عقد أتعاب» flag shown at the top of the case
 * file, so this is the direct remedy for a compliance warning rather than
 * bookkeeping for its own sake.
 */
export function FeeAgreementCard({ caseId }: { caseId: string }) {
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useFeeAgreements(caseId);

  if (isLoading) return <Skeleton className="h-28 w-full" />;

  const agreements = data ?? [];

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        Fee agreement
      </h3>

      {agreements.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No fee agreement"
          description="Recording the agreement removes the alert from the top of the case file."
          action={
            <Can permission="feeagreement:create">
              <Button size="sm" onClick={() => setFormOpen(true)}>
                Add fee agreement
              </Button>
            </Can>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {agreements.map((agreement) => (
              <li key={agreement.id} className="space-y-2 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{FEE_MODEL_AR[agreement.model]}</Badge>
                  <span className="ltr-numerals text-sm font-semibold text-ink">
                    {agreement.totalAmount
                      ? formatMoney(BigInt(agreement.totalAmount))
                      : agreement.percentageBps
                        ? `${agreement.percentageBps / 100}%`
                        : '—'}
                  </span>
                  {agreement.signedAt ? (
                    <span className="text-xs text-ink-subtle">
                      Signed on {formatLongDateAr(new Date(agreement.signedAt))}
                    </span>
                  ) : null}
                </div>

                {agreement.installments.length > 0 ? (
                  <ul className="space-y-1 border-s-2 border-line ps-3">
                    {agreement.installments.map((installment) => (
                      <li
                        key={installment.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-ink-muted">{installment.label}</span>
                        <span className="ltr-numerals text-ink">
                          {formatMoney(BigInt(installment.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <FeeAgreementSheet open={formOpen} onOpenChange={setFormOpen} caseId={caseId} />
    </div>
  );
}

function FeeAgreementSheet({
  open,
  onOpenChange,
  caseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}) {
  const [model, setModel] = useState<FeeModel>('FIXED');
  const [totalAmount, setTotalAmount] = useState('');
  const [percentage, setPercentage] = useState('10');
  const [signedAt, setSignedAt] = useState('');
  const [installments, setInstallments] = useState<FeeInstallmentInput[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const create = useCreateFeeAgreement();

  useEffect(() => {
    if (open) return;
    setModel('FIXED');
    setTotalAmount('');
    setPercentage('10');
    setSignedAt('');
    setInstallments([]);
    setFormError(null);
    setFieldErrors({});
  }, [open]);

  // Staged fees need at least one instalment to be meaningful; seed one so the
  // user edits rather than discovers an empty requirement at submit.
  useEffect(() => {
    if (model === 'STAGED' && installments.length === 0) {
      setInstallments([{ label: 'Advance payment', amount: '' }]);
    }
  }, [model, installments.length]);

  const installmentTotal = installments.reduce(
    (sum, installment) => sum + (installment.amount ? BigInt(installment.amount) : 0n),
    0n,
  );

  const submit = async () => {
    setFormError(null);
    setFieldErrors({});

    try {
      await create.mutateAsync({
        caseId,
        model,
        totalAmount:
          model === 'PERCENTAGE'
            ? undefined
            : model === 'STAGED'
              ? installmentTotal.toString()
              : totalAmount,
        percentageBps:
          model === 'PERCENTAGE' ? Math.round(Number.parseFloat(percentage) * 100) : undefined,
        signedAt: signedAt || undefined,
        installments: model === 'STAGED' ? installments : [],
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setFormError('Could not save the fee agreement.');
      }
    }
  };

  const canSubmit =
    model === 'PERCENTAGE'
      ? Number.parseFloat(percentage) > 0
      : model === 'STAGED'
        ? installments.length > 0 && installments.every((installment) => installment.amount)
        : Boolean(totalAmount);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Fee agreement">
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Agreement type</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {FEE_MODELS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setModel(option)}
                  aria-pressed={model === option}
                  className={cn(
                    'rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                    model === option
                      ? 'border-brand bg-brand-subtle text-brand'
                      : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                  )}
                >
                  {FEE_MODEL_AR[option]}
                </button>
              ))}
            </div>
          </fieldset>

          {model === 'FIXED' ? (
            <Field label="Fee amount" required error={fieldErrors.totalAmount?.[0]}>
              {(props) => <MoneyInput {...props} value={totalAmount} onChange={setTotalAmount} />}
            </Field>
          ) : null}

          {model === 'PERCENTAGE' ? (
            <Field
              label="Percentage"
              required
              error={fieldErrors.percentageBps?.[0]}
              hint="Of the claim amount or awarded amount."
            >
              {(props) => (
                <Input
                  {...props}
                  value={percentage}
                  onChange={(event) => setPercentage(event.target.value)}
                  inputMode="decimal"
                  dir="ltr"
                />
              )}
            </Field>
          ) : null}

          {model === 'STAGED' ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Installments</legend>

              {installments.map((installment, index) => (
                <div key={index} className="space-y-2 rounded-md border border-line p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={installment.label}
                      onChange={(event) =>
                        setInstallments((current) =>
                          current.map((item, position) =>
                            position === index ? { ...item, label: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Example: On judgment"
                      aria-label={`Installment description ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setInstallments((current) =>
                          current.filter((_, position) => position !== index),
                        )
                      }
                      aria-label={`Delete installment ${index + 1}`}
                      className="tap-target flex shrink-0 items-center justify-center rounded-md text-ink-subtle hover:bg-danger-subtle hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <MoneyInput
                    value={installment.amount}
                    onChange={(value) =>
                      setInstallments((current) =>
                        current.map((item, position) =>
                          position === index ? { ...item, amount: value } : item,
                        ),
                      )
                    }
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setInstallments((current) => [...current, { label: '', amount: '' }])
                }
              >
                <Plus className="size-4" />
                Add installment
              </Button>

              {/* The API rejects instalments that do not sum to the total, so the
                  running total is shown here rather than discovered on submit. */}
              <p className="ltr-numerals text-sm text-ink-muted">
                Total: {formatMoney(installmentTotal)}
              </p>
            </fieldset>
          ) : null}

          <Field label="Signature date">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={signedAt}
                onChange={(event) => setSignedAt(event.target.value)}
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
              loading={create.isPending}
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              Save agreement
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
