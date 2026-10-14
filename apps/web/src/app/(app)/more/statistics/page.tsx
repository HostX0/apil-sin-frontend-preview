'use client';

import { uiEnglish } from '@/lib/ui-english';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatMoney, type OfficeStatistics } from '@/lib/ui-shared';
import { Card, ErrorState, Skeleton, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useOfficeStatistics } from '@/lib/api/notifications';

export default function StatisticsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useOfficeStatistics();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
        >
          <ArrowRight className="size-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Office statistics</h1>
      </div>

      {isError ? (
        <ErrorState
          description={error instanceof ApiError ? error.messageAr : undefined}
          onRetry={() => void refetch()}
        />
      ) : isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <StatisticsView data={data} />
      )}
    </div>
  );
}

function StatisticsView({ data }: { data: OfficeStatistics }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tile label="Total cases" value={data.cases.total} />
        <Tile label="Active cases" value={data.cases.active} tone="brand" />
        <Tile label="Clients" value={data.clients.total} />
        <Tile label="Hearings in 30 days" value={data.hearings.upcoming30Days} tone="info" />
      </section>

      <Section title="Cases by type">
        <DistributionBars rows={data.cases.byType} total={data.cases.total} />
      </Section>

      <Section title="Cases by status">
        <DistributionBars rows={data.cases.byStatus} total={data.cases.total} />
      </Section>

      <Section title="Finance">
        <dl className="divide-y divide-line">
          {(
            [
              [
                data.finance.agreed !== undefined ? 'Agreed fees' : 'Total receipts',
                data.finance.agreed ?? data.finance.invoiced,
              ],
              ['Recipient', data.finance.paid],
              ['Outstanding', data.finance.outstanding],
              ['Expenses', data.finance.expenses],
            ] as ReadonlyArray<readonly [string, string]>
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 p-3.5">
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="ltr-numerals text-sm font-semibold text-ink">
                {formatMoney(BigInt(value))}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Follow-up">
        <dl className="divide-y divide-line">
          {(
            [
              ['Cases without fee agreements', data.watchlists.NO_FEE_AGREEMENT],
              ['Cases without certified powers of attorney', data.watchlists.NO_CERTIFIED_POA],
              ['Inactive cases', data.watchlists.INACTIVE_CASES],
              ['Documents expiring soon', data.documents.expiringSoon],
            ] as ReadonlyArray<readonly [string, number]>
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 p-3.5">
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd
                className={cn(
                  'ltr-numerals text-sm font-semibold tabular-nums',
                  value > 0 ? 'text-warning' : 'text-success',
                )}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{title}</h2>
      <Card>{children}</Card>
    </section>
  );
}

function Tile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'brand' | 'info';
}) {
  return (
    <div className="card-surface flex flex-col gap-1 p-3">
      <span
        className={cn(
          'ltr-numerals text-xl font-bold tabular-nums',
          tone === 'brand' && 'text-brand',
          tone === 'info' && 'text-info',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </span>
      <span className="text-xs leading-tight text-ink-muted">{label}</span>
    </div>
  );
}

/**
 * Proportional bars rather than a chart library.
 *
 * Four to nine rows of "label, count, share" is a list, not a visualisation —
 * and a charting dependency on a mobile-first page costs more than it explains.
 */
function DistributionBars({
  rows,
  total,
}: {
  rows: Array<{ label: string; count: number }>;
  total: number;
}) {
  if (rows.length === 0) {
    return <p className="p-4 text-center text-sm text-ink-muted">No data yet.</p>;
  }

  const sorted = [...rows].sort((a, b) => b.count - a.count);

  return (
    <ul className="divide-y divide-line">
      {sorted.map((row) => {
        const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
        return (
          <li key={uiEnglish(row.label, row.label)} className="space-y-1.5 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm text-ink">{uiEnglish(row.label, row.label)}</span>
              <span className="ltr-numerals shrink-0 text-sm font-semibold tabular-nums text-ink">
                {row.count}
                <span className="ms-1.5 text-xs font-normal text-ink-subtle">{share}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-brand" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
