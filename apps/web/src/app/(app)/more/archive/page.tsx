'use client';

import { Archive } from 'lucide-react';
import Link from 'next/link';
import { CASE_STATUS_AR, CASE_TYPE_AR, formatLongDateAr } from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@muhami/ui';
import { SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import { useCaseList } from '@/lib/api/cases';

/**
 * الأرشيف — closed and archived cases.
 *
 * Kept off the main Cases screen on purpose. A lawyer opening «الدعاوى» wants
 * the work in front of them, and a list where six years of finished matters
 * outnumber the live ones is a list nobody scrolls. Archived cases are not
 * deleted and not hidden — they are one tap away, here.
 *
 * Reuses the cases list endpoint with a status filter rather than adding one:
 * the same query, the same permissions, the same pagination.
 */
export default function ArchivePage() {
  const query = useCaseList({ status: ['ARCHIVED', 'CLOSED'], sort: 'activity' });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SettingsShell title="Archive" subtitle="Closed and archived cases" permission="case:read.all">
      <div className="space-y-4">
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            description={query.error instanceof ApiError ? query.error.messageAr : undefined}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="The archive is empty"
            description="Closed or archived cases appear here."
          />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {items.map((legalCase) => (
                <li key={legalCase.id}>
                  <Link
                    href={`/cases/${legalCase.id}`}
                    className="flex items-start gap-3 p-3.5 transition-colors hover:bg-surface-sunken"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="ltr-numerals text-sm font-semibold text-ink">
                          {legalCase.numberDisplay}
                        </span>
                        <Badge tone="neutral">{CASE_STATUS_AR[legalCase.status]}</Badge>
                      </div>
                      <p className="truncate text-sm text-ink-muted">{legalCase.clientName}</p>
                      <p className="truncate text-xs text-ink-subtle">
                        {CASE_TYPE_AR[legalCase.caseType]} · {legalCase.courtName}
                      </p>
                      {legalCase.lastActivityAt ? (
                        <p className="text-xs text-ink-subtle">
                          Last activity: {formatLongDateAr(new Date(legalCase.lastActivityAt))}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {query.hasNextPage ? (
          <Button
            variant="secondary"
            block
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Show more
          </Button>
        ) : (
          items.length > 0 && (
            <p className="pb-2 text-center text-xs text-ink-subtle">
              {items.length} {items.length === 1 ? 'case' : 'cases'}
            </p>
          )
        )}
      </div>
    </SettingsShell>
  );
}
