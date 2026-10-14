'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { formatMoney, type Balance } from '@/lib/ui-shared';
import { Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@muhami/ui';
import { ExpenseSheet } from './expense-sheet';
import { CaseFeePanel } from './case-fee-panel';
import { FeeAgreementCard } from './fee-agreement-card';
import { ReceiptSheet } from './receipt-sheet';
import { ExpensesList, ReceiptsList } from './finance-ledger-lists';
import { PrintButton } from '@/components/pdf/print-button';
import { pdfPaths } from '@/lib/api/pdf';
import { Can, useAuth } from '@/lib/auth-context';

/**
 * The finance panel, reused for a case, a client and the whole office.
 *
 * Same component, same calculation, three scopes — which is how the balances
 * shown in three places are provably the same numbers rather than three
 * implementations that happen to agree.
 */
interface FinancePanelProps {
  balance: Balance | undefined;
  isLoading: boolean;
  caseId?: string;
  clientId?: string;
  defaultTab?: 'receipts' | 'expenses';
}

export function FinancePanel(props: FinancePanelProps) {
  return props.caseId ? <CaseFeePanel caseId={props.caseId} /> : <LedgerFinancePanel {...props} />;
}

function LedgerFinancePanel({
  balance,
  isLoading,
  caseId,
  clientId,
  defaultTab = 'receipts',
}: FinancePanelProps) {
  const { can } = useAuth();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const canReadSummary = can('finance:read.summary');
  const canReadReceipts = can('invoice:read');
  const canReadExpenses = !clientId && can('expense:read');
  const canPrintStatement = canReadSummary && can('pdf:generate');
  const availableDefaultTab =
    defaultTab === 'expenses' && canReadExpenses
      ? 'expenses'
      : canReadReceipts
        ? 'receipts'
        : 'expenses';

  return (
    <div className="space-y-4">
      {canReadSummary ? <BalanceCards balance={balance} isLoading={isLoading} /> : null}

      <div className="flex flex-wrap gap-2">
        <Can permission="invoice:create">
          <Button size="sm" onClick={() => setReceiptOpen(true)}>
            <Plus className="size-4" />
            Payment receipt
          </Button>
        </Can>
        {!clientId ? (
          <Can permission="expense:create">
            <Button variant="secondary" size="sm" onClick={() => setExpenseOpen(true)}>
              <Plus className="size-4" />
              Expense
            </Button>
          </Can>
        ) : null}

        {canPrintStatement ? (
          <PrintButton
            path={`${pdfPaths.financialStatement}${
              caseId ? `?caseId=${caseId}` : clientId ? `?clientId=${clientId}` : ''
            }`}
            label="Account statement"
          />
        ) : null}
      </div>

      {/* Fee agreements belong to a case, so this only appears in that scope. */}
      {caseId ? <FeeAgreementCard caseId={caseId} /> : null}

      {canReadReceipts || canReadExpenses ? (
        <Tabs defaultValue={availableDefaultTab}>
          <TabsList>
            {canReadReceipts ? <TabsTrigger value="receipts">Receipts</TabsTrigger> : null}
            {canReadExpenses ? <TabsTrigger value="expenses">Expenses</TabsTrigger> : null}
          </TabsList>

          {canReadReceipts ? (
            <TabsContent value="receipts">
              <ReceiptsList caseId={caseId} clientId={clientId} />
            </TabsContent>
          ) : null}

          {canReadExpenses ? (
            <TabsContent value="expenses">
              <ExpensesList caseId={caseId} />
            </TabsContent>
          ) : null}
        </Tabs>
      ) : null}

      <ReceiptSheet
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        caseId={caseId}
        clientId={clientId}
      />
      <ExpenseSheet open={expenseOpen} onOpenChange={setExpenseOpen} caseId={caseId} />
    </div>
  );
}

function BalanceCards({
  balance,
  isLoading,
}: {
  balance: Balance | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !balance) {
    return (
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    );
  }

  const outstanding = BigInt(balance.outstanding);

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      <Tile label="Total receipts" value={formatMoney(BigInt(balance.invoiced))} tone="neutral" />
      <Tile label="Received" value={formatMoney(BigInt(balance.paid))} tone="success" />
      <Tile
        label="Receipt balance"
        value={formatMoney(outstanding)}
        tone={outstanding > 0n ? 'warning' : 'success'}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'warning';
}) {
  return (
    <div className="card-surface flex flex-col gap-1 p-3">
      <span
        className={cn(
          'ltr-numerals text-base font-bold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </span>
      <span className="text-xs leading-tight text-ink-muted">{label}</span>
    </div>
  );
}
