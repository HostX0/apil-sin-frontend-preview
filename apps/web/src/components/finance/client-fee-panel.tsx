'use client';

import { CaseNumber } from '@/components/cases/case-number';
import { useState } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import { formatMoney } from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useClientBalance, useClientCaseFees } from '@/lib/api/finance';
import { useAuth } from '@/lib/auth-context';
import { AccountFinanceSection } from './account-finance-section';
import { CaseFeePanel, FeeTotals } from './case-fee-panel';
import { FinancePanel } from './finance-panel';

export function ClientFeePanel({ clientId }: { clientId: string }) {
  const { can } = useAuth();
  const allowed = can('finance:read.summary') && can('feeagreement:read') && can('payment:read');
  const query = useClientCaseFees(clientId, allowed);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const canReadReceipts = can('invoice:read');
  const ledger = useClientBalance(clientId, receiptsOpen && can('finance:read.summary'));
  const rows = query.data ?? [];
  const hasUnpricedAgreement = rows.some((row) => row.hasUnpricedAgreement);
  const totals = rows.reduce(
    (sum, row) => ({
      agreed: sum.agreed + BigInt(row.agreed),
      received: sum.received + BigInt(row.received),
      remaining: sum.remaining + BigInt(row.remaining),
    }),
    { agreed: 0n, received: 0n, remaining: 0n },
  );

  return (
    <div className="space-y-6">
      {allowed ? <AccountFinanceSection clientId={clientId} /> : null}
      <div>
        <h2 className="text-base font-semibold text-ink">Client case fees</h2>
        <p className="mt-1 text-sm leading-7 text-ink-muted">
          Agreed fees, amounts received and balances for this client’s cases available to your
          account. Choose a case to view payments or record a new payment.
        </p>
      </div>
      {!allowed ? (
        <EmptyState
          icon={Wallet}
          title="Case fees are unavailable for your account"
          description="Ask the office owner for permission to view fees and payments."
        />
      ) : query.isLoading ? (
        <Skeleton className="h-44" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load client fees"
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No case fees to show"
          description="After registering a case for this client, add its fees to track amounts received and balances here."
        />
      ) : (
        <>
          <FeeTotals
            summary={{
              agreed: totals.agreed.toString(),
              received: totals.received.toString(),
              remaining: totals.remaining.toString(),
            }}
          />
          {hasUnpricedAgreement ? (
            <p className="rounded-xl bg-warning-subtle p-3 text-sm leading-7 text-warning">
              Some percentage fees have no amount set. The figures and balance shown cover fixed
              fees only.
            </p>
          ) : null}
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.caseId} className="overflow-hidden">
                <button
                  type="button"
                  aria-expanded={selectedCaseId === row.caseId}
                  onClick={() =>
                    setSelectedCaseId((current) => (current === row.caseId ? null : row.caseId))
                  }
                  className="flex w-full items-start justify-between gap-3 p-4 text-start"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink">
                      Case <CaseNumber value={row.caseNumber} />
                    </h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      Remaining:{' '}
                      <bdi className="font-semibold">{formatMoney(BigInt(row.remaining))}</bdi>
                    </p>
                    {!row.hasAgreement ? (
                      <Badge tone="warning" className="mt-2">
                        Fee not set
                      </Badge>
                    ) : null}
                    <p className="mt-2 text-xs font-medium text-brand">
                      {selectedCaseId === row.caseId
                        ? 'Hide payment details'
                        : 'View details and record payment'}
                    </p>
                  </div>
                  <ChevronDown
                    className={`mt-1 size-4 shrink-0 text-ink-muted ${selectedCaseId === row.caseId ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {selectedCaseId === row.caseId ? (
                  <div className="border-t border-line p-4">
                    <CaseFeePanel caseId={row.caseId} />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </>
      )}
      {canReadReceipts ? (
        <section className="rounded-xl border border-line p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={receiptsOpen}
            onClick={() => setReceiptsOpen((open) => !open)}
          >
            {receiptsOpen ? 'Hide client receipts' : 'View client receipts'}
          </Button>
          {receiptsOpen ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs leading-6 text-ink-muted">
                Receipts recorded for this client. Case fees and balances appear above.
              </p>
              {ledger.isError ? (
                <ErrorState title="Could not load receipts" onRetry={() => void ledger.refetch()} />
              ) : (
                <FinancePanel
                  balance={ledger.data}
                  isLoading={ledger.isLoading}
                  clientId={clientId}
                />
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
