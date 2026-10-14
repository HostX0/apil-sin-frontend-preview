'use client';

import { useId, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ClipboardList,
  FileText,
  Plus,
  Scale,
  Search,
  UserRound,
  Wallet,
} from 'lucide-react';
import { formatLongDateAr, formatMoney, toBaghdadDateKey } from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Sheet,
  SheetContent,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@muhami/ui';
import { useCaseFeeList } from '@/lib/api/finance';
import {
  useFinanceAccounts,
  useFinanceActivity,
  useFinanceWorkspaceSummary,
} from '@/lib/api/finance-accounts';
import { useAuth } from '@/lib/auth-context';
import { PrintButton } from '@/components/pdf/print-button';
import { CaseFeePanel, FeeTotals } from './case-fee-panel';
import { ExpenseSheet } from './expense-sheet';
import {
  FinanceAccountCreateSheet,
  FinanceAccountPanel,
  FinanceMovementRow,
} from './finance-account-panel';
import { ExpensesList, ReceiptsList } from './finance-ledger-lists';
import {
  filterFinancialFiles,
  financialFiles,
  type FinancialFile,
} from './finance-workspace-utils';

type MainAction = 'fee' | 'payment' | 'expense';
type OpenFile = { file: FinancialFile; action?: MainAction };

export function OfficeFinancePage({
  defaultTab = 'receipts',
}: {
  defaultTab?: 'receipts' | 'expenses';
}) {
  const { can } = useAuth();
  const allowed =
    can('finance:read.summary') &&
    can('feeagreement:read') &&
    can('payment:read') &&
    can('expense:read');
  const cases = useCaseFeeList(allowed);
  const accounts = useFinanceAccounts({}, allowed);
  const summary = useFinanceWorkspaceSummary(allowed);
  const [tab, setTab] = useState(defaultTab === 'expenses' ? 'expenses' : 'fees');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | FinancialFile['status']>('all');
  const [selected, setSelected] = useState<OpenFile | null>(null);
  const [selectedBusy, setSelectedBusy] = useState(false);
  const [chooser, setChooser] = useState<MainAction | null>(null);
  const [chooseCase, setChooseCase] = useState(false);
  const [chooserSearch, setChooserSearch] = useState('');
  const [creationMode, setCreationMode] = useState<'independent' | 'client' | 'transaction'>(
    'independent',
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [officeExpenseOpen, setOfficeExpenseOpen] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const today = toBaghdadDateKey(new Date());
  const periodId = useId();
  const [from, setFrom] = useState(today.slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const validPeriod = Boolean(from && to && from <= to);
  const activity = useFinanceActivity(
    { from, to },
    tab === 'statement' && allowed && can('expense:read') && validPeriod,
  );
  const loading = cases.isLoading || accounts.isLoading || summary.isLoading;
  const failed = cases.isError || accounts.isError || summary.isError;
  const files = financialFiles(cases.data ?? [], accounts.data ?? []);
  const shown = filterFinancialFiles(files, search, status);
  const chooserFiles = filterFinancialFiles(files, chooserSearch, 'all').filter((file) => {
    if (chooser === 'fee' && chooseCase) return file.kind === 'case';
    if (chooser === 'payment') return file.status === 'outstanding';
    return true;
  });
  const accountExpenses = (accounts.data ?? [])
    .flatMap((account) =>
      account.movements
        .filter((movement) => movement.kind === 'EXPENSE')
        .map((movement) => ({ account, movement })),
    )
    .sort((left, right) => right.movement.occurredAt.localeCompare(left.movement.occurredAt));
  const canPay = can('payment:create') && can('invoice:create');
  const openChooser = (action: MainAction) => {
    setChooser(action);
    setChooseCase(false);
    setChooserSearch('');
  };
  const openCreate = (mode: typeof creationMode) => {
    setCreationMode(mode);
    setChooser(null);
    setCreateOpen(true);
  };
  const retry = () => {
    void cases.refetch();
    void accounts.refetch();
    void summary.refetch();
  };
  if (!allowed)
    return (
      <EmptyState
        icon={Wallet}
        title="Finance is unavailable for your account"
        description="Ask the office administrator for permission to view fees and payments."
      />
    );
  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Office fees and expenses</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">Finance</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-muted">
          See agreed fees, amounts received and the balance due. Link them to a case, transaction or
          client, or create an independent account.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {can('feeagreement:create') ? (
          <Button onClick={() => openChooser('fee')}>
            <Plus className="size-4" aria-hidden />
            Add fees
          </Button>
        ) : null}
        {canPay ? (
          <Button
            variant="secondary"
            onClick={() => openChooser('payment')}
            disabled={loading || failed}
          >
            <ArrowDownToLine className="size-4" aria-hidden />
            Record a payment
          </Button>
        ) : null}
        {can('expense:create') ? (
          <Button
            variant="secondary"
            onClick={() => openChooser('expense')}
            disabled={loading || failed}
          >
            <ArrowUpFromLine className="size-4" aria-hidden />
            Record an expense
          </Button>
        ) : null}
      </div>
      {notice ? (
        <p role="status" className="rounded-xl bg-success-subtle p-3 text-sm text-success">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <Skeleton className="h-32" />
      ) : failed || !summary.data ? (
        <ErrorState
          title="Could not load finance"
          description="The balance has not finished loading. Try again before recording an amount."
          onRetry={retry}
        />
      ) : (
        <FeeTotals summary={summary.data} />
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="fees"
            className="min-w-0 whitespace-normal px-1 text-xs leading-6 sm:px-3 sm:text-sm"
          >
            Fees and payments
          </TabsTrigger>
          {can('expense:read') ? (
            <TabsTrigger
              value="expenses"
              className="min-w-0 whitespace-normal px-1 text-xs leading-6 sm:px-3 sm:text-sm"
            >
              Expenses
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="statement"
            className="min-w-0 whitespace-normal px-1 text-xs leading-6 sm:px-3 sm:text-sm"
          >
            Account statement
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fees">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute start-3 top-3.5 size-4 text-ink-muted"
                    aria-hidden
                  />
                  <Input
                    aria-label="Search financial files"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="ps-10"
                    placeholder="Client name, case number or fee title"
                  />
                </div>
                <select
                  aria-label="Fee payment status"
                  className="h-11 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                >
                  <option value="all">All files</option>
                  <option value="outstanding">Outstanding</option>
                  <option value="settled">Settled</option>
                  <option value="no-fee">No fee</option>
                  <option value="unpriced">Fee not set</option>
                </select>
              </div>
            </Card>
            {loading ? (
              <Skeleton className="h-44" />
            ) : failed ? null : shown.length ? (
              <div className="space-y-3">
                {shown.map((file) => (
                  <FinancialFileCard
                    key={file.kind + file.id}
                    file={file}
                    onSelect={() => setSelected({ file })}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-5">
                <EmptyState
                  icon={Wallet}
                  title={
                    search || status !== 'all'
                      ? 'No matching files'
                      : 'Start with your first fee agreement'
                  }
                  description={
                    search || status !== 'all'
                      ? 'Change the search or payment status.'
                      : 'Select Add fees, choose who they relate to, and enter the agreed amount. Then record each payment or expense.'
                  }
                />
                {!search && status === 'all' && can('feeagreement:create') ? (
                  <Button block className="mt-3" onClick={() => openChooser('fee')}>
                    <Plus className="size-4" aria-hidden />
                    Add first fees
                  </Button>
                ) : null}
              </Card>
            )}
          </div>
        </TabsContent>
        {can('expense:read') ? (
          <TabsContent value="expenses">
            <div className="space-y-4">
              <p className="rounded-xl bg-surface-sunken p-3 text-sm leading-7 text-ink-muted">
                Office expenses are recorded separately. Expenses linked to a case or transaction
                also appear in that file. Charged to client is for tracking only and does not
                increase fees automatically.
              </p>
              {!loading && !failed && summary.data ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <MoneyTile title="All recorded expenses" amount={summary.data.expenses} />
                  <MoneyTile
                    title="Client expenses — for tracking"
                    amount={summary.data.billableExpenses}
                  />
                </div>
              ) : null}
              <section className="space-y-3">
                <h2 className="font-semibold text-ink">Office and case expenses</h2>
                <ExpensesList />
              </section>
              {accountExpenses.length ? (
                <section className="space-y-3">
                  <h2 className="font-semibold text-ink">Transaction and account expenses</h2>
                  <Card>
                    <ul className="divide-y divide-line">
                      {accountExpenses.map(({ account, movement }) => (
                        <FinanceMovementRow
                          key={movement.id}
                          movement={movement}
                          fileTitle={account.title}
                        />
                      ))}
                    </ul>
                  </Card>
                  <p className="text-xs text-ink-muted">
                    To correct an expense, open its file in Fees and payments.
                  </p>
                </section>
              ) : null}
            </div>
          </TabsContent>
        ) : null}
        <TabsContent value="statement">
          <div className="space-y-4">
            <p className="text-sm leading-7 text-ink-muted">
              Choose a period to see amounts received and spent, or print a statement to keep and
              share.
            </p>
            <Card className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  htmlFor={`${periodId}-from`}
                  className="space-y-2 text-sm font-medium text-ink"
                >
                  <span className="block">From date</span>
                  <Input
                    type="date"
                    id={`${periodId}-from`}
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </label>
                <label
                  htmlFor={`${periodId}-to`}
                  className="space-y-2 text-sm font-medium text-ink"
                >
                  <span className="block">To date</span>
                  <Input
                    type="date"
                    id={`${periodId}-to`}
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </label>
              </div>
              {!validPeriod ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  Choose two valid dates. The start date must be on or before the end date.
                </p>
              ) : null}
            </Card>
            {!can('expense:read') ? (
              <EmptyState
                icon={FileText}
                title="Cash movement statement unavailable"
                description="You need permission to view expenses, fees and payments."
              />
            ) : !validPeriod ? null : activity.isLoading ? (
              <Skeleton className="h-32" />
            ) : activity.isError ? (
              <ErrorState onRetry={() => void activity.refetch()} />
            ) : activity.data ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MoneyTile
                    title="Received during period"
                    amount={activity.data.received}
                    tone="success"
                  />
                  <MoneyTile title="Spent during period" amount={activity.data.expenses} />
                  <MoneyTile
                    title="Net movement"
                    amount={activity.data.netReceived}
                    hint="Received minus spent."
                  />
                </div>
                <PrintButton
                  path={`/pdf/finance-workspace/statement?from=${from}&to=${to}`}
                  label="Print period statement"
                />
                {activity.data.items.length ? (
                  <Card>
                    <ul className="divide-y divide-line">
                      {activity.data.items.map((item) => (
                        <li key={item.id} className="space-y-2 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge tone={item.kind === 'PAYMENT' ? 'success' : 'neutral'}>
                              {item.kind === 'PAYMENT' ? 'Payment received' : 'Expense'}
                            </Badge>
                            <bdi
                              className={cn(
                                'font-semibold',
                                item.kind === 'PAYMENT' ? 'text-success' : 'text-ink',
                              )}
                            >
                              {formatMoney(BigInt(item.amount))}
                            </bdi>
                          </div>
                          <p className="text-sm text-ink">{item.description}</p>
                          <p className="text-xs leading-6 text-ink-muted">
                            {item.partyName ? `${item.partyName} · ` : ''}
                            {item.contextLabel} · {formatLongDateAr(new Date(item.occurredAt))}
                          </p>
                          {item.accountId || item.caseId ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const file = files.find(
                                  (row) =>
                                    row.id === (item.accountId ?? item.caseId) &&
                                    row.kind === (item.accountId ? 'account' : 'case'),
                                );
                                if (file) setSelected({ file });
                              }}
                            >
                              Open financial file
                            </Button>
                          ) : null}
                          {item.movementId && item.kind === 'PAYMENT' ? (
                            <PrintButton
                              path={`/pdf/finance-movements/${item.movementId}/receipt`}
                              label="Payment receipt"
                              variant="ghost"
                            />
                          ) : item.invoiceId ? (
                            <PrintButton
                              path={`/pdf/receipts/${item.invoiceId}`}
                              label="Payment receipt"
                              variant="ghost"
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : (
                  <EmptyState
                    icon={Wallet}
                    title="No cash movements in this period"
                    description="Change the dates or record the first payment or expense."
                  />
                )}
              </>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
      {!loading &&
      !failed &&
      summary.data &&
      BigInt(summary.data.legacyUnlinked.agreed) > 0n &&
      can('invoice:read') ? (
        <section className="rounded-xl border border-line p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLegacyOpen((value) => !value)}
            aria-expanded={legacyOpen}
          >
            {legacyOpen ? 'Hide' : 'View'} additional recorded receipts
          </Button>
          {legacyOpen ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-7 text-ink-muted">
                These receipts are included in the office summary. Track and correct their payments
                here.
              </p>
              <ReceiptsList />
            </div>
          ) : null}
        </section>
      ) : null}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !selectedBusy) setSelected(null);
        }}
      >
        <SheetContent
          title={selected?.file.title ?? 'Financial file'}
          description="Fees, payments and expenses in one place."
          className="sm:max-w-3xl"
        >
          {selected ? (
            selected.file.kind === 'case' ? (
              <CaseFeePanel
                key={selected.file.id + (selected.action ?? '')}
                caseId={selected.file.id}
                initialAction={selected.action}
                onBusyChange={setSelectedBusy}
              />
            ) : (
              <FinanceAccountPanel
                key={selected.file.id + (selected.action ?? '')}
                accountId={selected.file.id}
                initialAction={selected.action}
                onBusyChange={setSelectedBusy}
              />
            )
          ) : null}
        </SheetContent>
      </Sheet>
      <Sheet
        open={Boolean(chooser)}
        onOpenChange={(open) => {
          if (!open) setChooser(null);
        }}
      >
        <SheetContent
          title={
            chooser === 'fee'
              ? 'What are the fees for?'
              : chooser === 'payment'
                ? 'Which file is the payment for?'
                : 'What is the expense for?'
          }
          description={
            chooser === 'fee'
              ? 'Choose the appropriate link, or record fees independently.'
              : 'Choose a file to record the amount in the right place.'
          }
        >
          <div className="space-y-4">
            {chooser === 'fee' && !chooseCase ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Choice
                  icon={Scale}
                  title="Existing case"
                  description="The same case fees, without duplication."
                  onClick={() => setChooseCase(true)}
                />
                <Choice
                  icon={Wallet}
                  title="Independent account"
                  description="A consultation or fees without a client or case."
                  onClick={() => openCreate('independent')}
                />
                {can('client:read.all') ? (
                  <Choice
                    icon={UserRound}
                    title="Existing client"
                    description="Additional fees linked to the client file."
                    onClick={() => openCreate('client')}
                  />
                ) : null}
                {can('transaction:read') ? (
                  <Choice
                    icon={ClipboardList}
                    title="Existing transaction"
                    description="Track fees alongside transaction documents."
                    onClick={() => openCreate('transaction')}
                  />
                ) : null}
              </div>
            ) : (
              <>
                {chooser === 'expense' ? (
                  <Choice
                    icon={Wallet}
                    title="Office expense"
                    description="Rent, stationery, travel or a general expense without a file."
                    onClick={() => {
                      setChooser(null);
                      setOfficeExpenseOpen(true);
                    }}
                  />
                ) : null}
                <Input
                  aria-label="Search for a file"
                  value={chooserSearch}
                  onChange={(event) => setChooserSearch(event.target.value)}
                  placeholder="Search by name or case number"
                />
                {loading ? (
                  <Skeleton className="h-40" />
                ) : failed ? (
                  <ErrorState onRetry={retry} />
                ) : chooserFiles.length ? (
                  <ul className="max-h-80 space-y-2 overflow-y-auto">
                    {chooserFiles.map((file) => (
                      <li key={file.kind + file.id}>
                        <button
                          type="button"
                          className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-line p-3 text-start hover:bg-surface-sunken"
                          onClick={() => {
                            setSelected({ file, action: chooser ?? undefined });
                            setChooser(null);
                          }}
                        >
                          <span>
                            <span className="block font-medium text-ink">{file.title}</span>
                            <span className="mt-1 block text-xs text-ink-muted">{file.party}</span>
                          </span>
                          <span className="shrink-0 text-xs text-ink-muted">
                            {chooser === 'payment' ? (
                              <>
                                Remaining{' '}
                                <bdi className="block font-semibold text-ink">
                                  {formatMoney(BigInt(file.remaining))}
                                </bdi>
                              </>
                            ) : (
                              file.context
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={Wallet}
                    title={chooser === 'payment' ? 'No outstanding balances' : 'No matching file'}
                    description={
                      chooser === 'payment'
                        ? 'Add fees first. Cases with no fees set are not considered settled.'
                        : 'Change the search or add the file first. Fees can be recorded independently.'
                    }
                  />
                )}
                {chooser === 'fee' && chooseCase ? (
                  <Button type="button" variant="ghost" block onClick={() => setChooseCase(false)}>
                    Back to fee type
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <FinanceAccountCreateSheet
        key={creationMode}
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            void accounts.refetch();
            void summary.refetch();
          }
        }}
        initialMode={creationMode}
        onCreated={(account, created) => {
          const file = financialFiles([], [account])[0]!;
          setSelected({ file });
          setNotice(
            created === false
              ? 'Opened finance for the existing transaction.'
              : 'Fee agreement saved. Record the first payment in the same file.',
          );
        }}
      />
      <ExpenseSheet open={officeExpenseOpen} onOpenChange={setOfficeExpenseOpen} />
    </div>
  );
}

function Choice({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Wallet;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 items-start gap-3 rounded-xl border border-line bg-surface p-4 text-start transition-colors hover:border-brand hover:bg-brand-subtle"
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-xs leading-6 text-ink-muted">{description}</span>
      </span>
    </button>
  );
}

function FinancialFileCard({ file, onSelect }: { file: FinancialFile; onSelect: () => void }) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-col gap-4 p-4 text-start sm:flex-row sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-ink">{file.title}</h2>
            <Badge tone="neutral">{file.context}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{file.party}</p>
          <Badge
            className="mt-2"
            tone={
              file.status === 'unpriced'
                ? 'warning'
                : file.status === 'settled'
                  ? 'success'
                  : 'neutral'
            }
          >
            {file.status === 'unpriced'
              ? 'Fee not set'
              : file.status === 'settled'
                ? 'Settled'
                : file.status === 'no-fee'
                  ? 'No fee'
                  : 'Outstanding balance'}
          </Badge>
          <p className="mt-2 text-xs font-medium text-brand">Open file and record payments</p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-xs sm:min-w-96">
          {[
            ['Agreed', file.agreed, 'text-ink'],
            ['Recipient', file.received, 'text-success'],
            [
              'Remaining balance',
              file.remaining,
              BigInt(file.remaining) > 0n ? 'text-warning' : 'text-ink',
            ],
          ].map(([label, value, tone]) => (
            <div key={label}>
              <dt className="text-ink-muted">{label}</dt>
              <dd className={cn('mt-1 font-semibold', tone)}>
                <bdi>{formatMoney(BigInt(value!))}</bdi>
              </dd>
            </div>
          ))}
        </dl>
        <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden />
      </button>
    </Card>
  );
}

function MoneyTile({
  title,
  amount,
  tone,
  hint,
}: {
  title: string;
  amount: string;
  tone?: 'success';
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-muted">{title}</p>
      <p
        className={cn(
          'ltr-numerals mt-2 text-xl font-bold',
          tone === 'success' ? 'text-success' : 'text-ink',
        )}
      >
        {formatMoney(BigInt(amount))}
      </p>
      {hint ? <p className="mt-2 text-xs leading-6 text-ink-muted">{hint}</p> : null}
    </Card>
  );
}
