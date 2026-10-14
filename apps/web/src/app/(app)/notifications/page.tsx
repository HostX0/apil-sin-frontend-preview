'use client';

import { uiSystemText } from '@/lib/ui-english';

import { BellOff, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { NOTIFICATION_KIND_AR, formatLongDateAr, type NotificationItem } from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useMarkRead, useNotifications } from '@/lib/api/notifications';

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);

  const query = useNotifications(unreadOnly);
  const markRead = useMarkRead();

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = items.some((item) => item.readAt === null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-ink lg:text-2xl">Notifications</h1>
        {hasUnread ? (
          <Button
            variant="secondary"
            size="sm"
            loading={markRead.isPending}
            onClick={() => markRead.mutate({ all: true })}
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
        ) : null}
      </div>

      <div className="flex gap-1 rounded-md bg-surface-sunken p-1">
        {[
          { value: false, label: 'All' },
          { value: true, label: 'Unread' },
        ].map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => setUnreadOnly(option.value)}
            aria-pressed={unreadOnly === option.value}
            className={cn(
              'min-h-11 flex-1 rounded px-3 text-xs font-medium transition-colors',
              unreadOnly === option.value ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {markRead.isError ? (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger">
          {markRead.error instanceof ApiError
            ? markRead.error.messageAr
            : 'Could not update notifications. Please try again.'}
        </p>
      ) : null}

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
          icon={BellOff}
          title={unreadOnly ? 'No unread notifications' : 'No notifications'}
          description={
            unreadOnly
              ? 'All current notifications are read. Choose All to review them.'
              : 'Hearing, appointment and follow-up reminders appear here. Adjust them in My notifications.'
          }
          action={
            <Button variant="secondary" asChild>
              <Link href="/more/notifications">My notification settings</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onRead={() => markRead.mutate({ ids: [item.id] })}
                />
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
          ) : null}
        </>
      )}
    </div>
  );
}

function NotificationRow({ item, onRead }: { item: NotificationItem; onRead: () => void }) {
  const unread = item.readAt === null;

  const content = (
    <div className="flex items-start gap-3 p-3.5">
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          unread ? 'bg-brand' : 'bg-transparent',
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('text-sm', unread ? 'font-semibold text-ink' : 'text-ink-muted')}>
            {uiSystemText(item.titleAr)}
          </span>
          <Badge tone="neutral">{NOTIFICATION_KIND_AR[item.kind]}</Badge>
        </div>
        {item.bodyAr ? <p className="text-xs text-ink-muted">{uiSystemText(item.bodyAr)}</p> : null}
        <p className="text-xs text-ink-subtle">{formatLongDateAr(new Date(item.createdAt))}</p>
      </div>
    </div>
  );

  // Opening a notification marks it read — the same gesture, not a second one.
  return (
    <li>
      {item.link ? (
        <Link
          href={item.link}
          onClick={() => unread && onRead()}
          className="block hover:bg-surface-sunken"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => unread && onRead()}
          className="block w-full text-start hover:bg-surface-sunken"
        >
          {content}
        </button>
      )}
    </li>
  );
}
