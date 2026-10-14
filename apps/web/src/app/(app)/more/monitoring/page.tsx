'use client';

import { ArrowUpLeft, CircleDollarSign, FileWarning, ScrollText, TimerOff } from 'lucide-react';
import Link from 'next/link';
import type { WatchlistCounts } from '@muhami/shared';
import { Card, ErrorState, Skeleton } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useWatchlistCounts } from '@/lib/api/notifications';

const LISTS = [
  {
    href: '/more/monitoring/no-fee-agreement',
    count: 'NO_FEE_AGREEMENT' as keyof WatchlistCounts,
    title: 'Cases without fee agreements',
    description: 'Active files that need a recorded fee agreement.',
    icon: ScrollText,
  },
  {
    href: '/more/monitoring/no-certified-poa',
    count: 'NO_CERTIFIED_POA' as keyof WatchlistCounts,
    title: 'Cases without certified powers of attorney',
    description: 'Files without a certified power of attorney attached.',
    icon: FileWarning,
  },
  {
    href: '/more/monitoring/outstanding-fees',
    count: 'OUTSTANDING_FEES' as keyof WatchlistCounts,
    title: 'Outstanding fees',
    description: 'Files with fees that have not been fully paid.',
    icon: CircleDollarSign,
  },
  {
    href: '/more/monitoring/inactive-cases',
    count: 'INACTIVE_CASES' as keyof WatchlistCounts,
    title: 'Inactive cases',
    description: 'Files with no recent activity.',
    icon: TimerOff,
  },
] as const;

export default function MonitoringPage() {
  const query = useWatchlistCounts();

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Follow up before work falls behind</p>
        <h1 className="mt-1 font-display text-xl font-bold text-ink lg:text-2xl">Follow-up</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-muted">
          Short lists show files needing attention before an issue becomes a delay or a forgotten
          payment.
        </p>
      </div>

      {query.isError ? (
        <ErrorState
          title="Could not load follow-up lists"
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {LISTS.map((item) => {
            const Icon = item.icon;
            const count = query.data?.[item.count];

            return (
              <Link key={item.href} href={item.href} className="group block">
                <Card className="interactive-lift h-full p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning-subtle text-warning">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-ink">{item.title}</h2>
                        {query.isLoading ? (
                          <Skeleton className="size-7 rounded-full" />
                        ) : (
                          <span className="ltr-numerals flex min-w-7 items-center justify-center rounded-full bg-surface-sunken px-2 py-1 text-xs font-bold text-ink">
                            {count ?? 0}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-ink-muted">{item.description}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                        Open list
                        <ArrowUpLeft
                          className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
