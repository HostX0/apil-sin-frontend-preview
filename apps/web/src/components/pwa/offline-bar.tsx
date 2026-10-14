'use client';

import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@muhami/ui';
import { useOnline, useOutbox } from '@/lib/offline';
import { flushOutbox, startOutboxSync } from '@/lib/outbox';

/**
 * The one piece of chrome that tells the truth about connectivity.
 *
 * Three states, in priority order:
 *
 *   1. **Blocked changes** — something needs the user. Shown even when online,
 *      because a parked conflict is easy to forget and expensive to lose.
 *   2. **Offline** — with the number of writes waiting, so "will my work
 *      survive" has a visible answer rather than a hope.
 *   3. **Syncing** — brief, and only while entries are actually going out.
 *
 * When there is nothing to say it renders nothing. A permanent status bar
 * saying "متصل" is noise that trains people to stop reading the bar.
 */
export function OfflineBar() {
  const online = useOnline();
  const entries = useOutbox();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const pending = entries.filter(
    (entry) => entry.status === 'PENDING' || entry.status === 'SENDING',
  ).length;
  const blocked = entries.filter(
    (entry) => entry.status === 'FAILED' || entry.status === 'CONFLICT',
  ).length;

  useEffect(
    () =>
      startOutboxSync(() => {
        // Anything that landed changed server state we may be showing.
        void queryClient.invalidateQueries();
      }),
    [queryClient],
  );

  const syncNow = async () => {
    setSyncing(true);
    try {
      const result = await flushOutbox();
      if (result.sent > 0) await queryClient.invalidateQueries();
    } finally {
      setSyncing(false);
    }
  };

  if (blocked > 0) {
    return (
      <Bar tone="danger">
        <TriangleAlert className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{blocked}changes need review before saving</span>
        <Link href="/more/pending" className="shrink-0 font-semibold underline underline-offset-2">
          Review
        </Link>
      </Bar>
    );
  }

  if (!online) {
    return (
      <Bar tone="warning">
        <CloudOff className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {pending > 0
            ? `Offline · ${pending} changes saved locally and will be sent automatically`
            : 'Offline · Connect to see the latest data'}
        </span>
      </Bar>
    );
  }

  if (pending > 0) {
    return (
      <Bar tone="info">
        <RefreshCw className={cn('size-4 shrink-0', syncing && 'animate-spin')} />
        <span className="min-w-0 flex-1 truncate">{pending} changes being sent</span>
        <button
          type="button"
          onClick={() => void syncNow()}
          className="shrink-0 font-semibold underline underline-offset-2"
        >
          Send now
        </button>
      </Bar>
    );
  }

  return null;
}

function Bar({
  tone,
  children,
}: {
  tone: 'danger' | 'warning' | 'info';
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-xs font-medium',
        tone === 'danger' && 'bg-danger-subtle text-danger',
        tone === 'warning' && 'bg-warning-subtle text-warning',
        tone === 'info' && 'bg-info-subtle text-info',
      )}
    >
      {children}
    </div>
  );
}
