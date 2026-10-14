'use client';

import { ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  WATCHLISTS,
  WATCHLIST_AR,
  WATCHLIST_DESCRIPTION_AR,
  type Watchlist,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useWatchlist } from '@/lib/api/notifications';

/** URL slugs, so a watchlist link is readable and stable. */
const SLUG_TO_LIST: Record<string, Watchlist> = {
  'no-fee-agreement': 'NO_FEE_AGREEMENT',
  'no-certified-poa': 'NO_CERTIFIED_POA',
  'outstanding-fees': 'OUTSTANDING_FEES',
  'inactive-cases': 'INACTIVE_CASES',
};

export default function WatchlistPage() {
  const params = useParams<{ list: string }>();
  const router = useRouter();

  const list = SLUG_TO_LIST[params.list];

  if (!list) {
    return (
      <EmptyState
        title="Unknown list"
        description="Choose a follow-up list from More."
        action={
          <Button size="sm" onClick={() => router.push('/more')}>
            Return to More
          </Button>
        }
      />
    );
  }

  return <WatchlistView list={list} />;
}

function WatchlistView({ list }: { list: Watchlist }) {
  const router = useRouter();
  const query = useWatchlist(list);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
        >
          <ArrowRight className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold text-ink">{WATCHLIST_AR[list]}</h1>
          <p className="truncate text-xs text-ink-subtle">{WATCHLIST_DESCRIPTION_AR[list]}</p>
        </div>
      </div>

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
        // An empty watchlist is good news, and should read like it — not like
        // an error or a data-loading failure.
        <EmptyState
          icon={ShieldCheck}
          title="No issues to follow up"
          description="All cases meet this check. No action is needed."
        />
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.caseId}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 p-3.5 transition-colors hover:bg-surface-sunken"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="ltr-numerals text-sm font-semibold text-ink">
                        {item.numberDisplay}
                      </p>
                      <p className="truncate text-sm text-ink-muted">{item.clientName}</p>
                      <p className="truncate text-xs text-ink-subtle">
                        {item.subject} · {item.courtName}
                      </p>
                    </div>
                    <Badge tone="warning">{item.detail}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

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
            <p className="pb-2 text-center text-xs text-ink-subtle">
              {items.length} {items.length === 1 ? 'case' : 'cases'}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export { SLUG_TO_LIST, WATCHLISTS };
