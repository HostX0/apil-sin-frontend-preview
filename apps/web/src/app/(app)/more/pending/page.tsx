'use client';

import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  OUTBOX_STATUS_AR,
  formatLongDateAr,
  type HearingDetail,
  type OutboxEntry,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState } from '@muhami/ui';
import { SettingsShell } from '@/components/settings/settings-shell';
import { ApiError, api } from '@/lib/api-client';
import { useOnline, useOutbox } from '@/lib/offline';
import { discard, flushOutbox, retry } from '@/lib/outbox';

/**
 * التغييرات المعلّقة — everything the app has recorded but not yet saved.
 *
 * This screen exists because a sync queue that resolves conflicts on its own is
 * a sync queue that loses work. When a replayed write collides with someone
 * else's edit, the app has no basis for choosing a winner: only the lawyer
 * knows whether their note or their colleague's is the one that belongs on the
 * record. So the entry stops here, in plain Arabic, with exactly two buttons.
 */
export default function PendingChangesPage() {
  const entries = useOutbox();
  const online = useOnline();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const waiting = entries.filter(
    (entry) => entry.status === 'PENDING' || entry.status === 'SENDING',
  );
  const blocked = entries.filter(
    (entry) => entry.status === 'FAILED' || entry.status === 'CONFLICT',
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

  return (
    <SettingsShell
      title="Pending changes"
      subtitle="Changes saved on this device awaiting office synchronisation."
      actions={
        waiting.length > 0 && online ? (
          <Button size="sm" loading={syncing} onClick={() => void syncNow()}>
            <RefreshCw className="size-4" />
            Sync now
          </Button>
        ) : null
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No pending changes"
          description="No changes on this device are waiting to sync."
        />
      ) : (
        <div className="space-y-5">
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-subtle">
            Sync these changes before signing out or switching accounts. Unsent local changes are
            removed on sign-out to protect office data.
          </p>
          {blocked.length > 0 ? (
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-danger">
                Your decision is needed
              </h2>
              <Card>
                <ul className="divide-y divide-line">
                  {blocked.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} resolvable />
                  ))}
                </ul>
              </Card>
              <p className="px-1 text-xs text-ink-subtle">
                If another device changed the record, review the file before submitting again.
                Remove change deletes only the local pending copy, not the saved office record.
              </p>
            </section>
          ) : null}

          {waiting.length > 0 ? (
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Pending
              </h2>
              <Card>
                <ul className="divide-y divide-line">
                  {waiting.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} resolvable={false} />
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </div>
      )}
    </SettingsShell>
  );
}

function EntryRow({ entry, resolvable }: { entry: OutboxEntry; resolvable: boolean }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const body =
    entry.body && typeof entry.body === 'object' ? (entry.body as Record<string, unknown>) : {};
  const savedText =
    typeof body['outcomeNotes'] === 'string'
      ? body['outcomeNotes']
      : typeof body['body'] === 'string'
        ? body['body']
        : null;

  const tone =
    entry.status === 'CONFLICT' ? 'warning' : entry.status === 'FAILED' ? 'danger' : 'neutral';

  return (
    <li className="space-y-2 p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm text-ink">{entry.labelAr}</p>
          <p className="text-xs text-ink-subtle">
            {formatLongDateAr(new Date(entry.queuedAt))}
            {entry.attempts > 0 ? ` · ${entry.attempts} Attempt` : ''}
          </p>
          {entry.lastErrorAr ? <p className="text-xs text-danger">{entry.lastErrorAr}</p> : null}
        </div>
        <Badge tone={tone}>{OUTBOX_STATUS_AR[entry.status]}</Badge>
      </div>
      {savedText ? (
        <details className="rounded-md bg-surface-sunken p-3">
          <summary className="cursor-pointer text-xs font-medium text-ink">
            View text saved on this device
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-muted">{savedText}</p>
        </details>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}

      {resolvable ? (
        <div className="flex gap-2">
          {entry.status === 'CONFLICT' ? (
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={async () => {
                const hearingId = entry.path.match(/^\/hearings\/([^/]+)\/outcome$/)?.[1];
                setError(null);
                if (!hearingId) {
                  router.push(entry.path.startsWith('/whatsapp') ? '/whatsapp' : '/calendar');
                  return;
                }
                setBusy(true);
                try {
                  const hearing = await api.get<HearingDetail>(`/hearings/${hearingId}`);
                  router.push(`/cases/${hearing.caseId}`);
                } catch (caught) {
                  setError(
                    caught instanceof ApiError
                      ? caught.messageAr
                      : 'Could not open the file. Please try again.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Open file to review
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await retry(entry.id);
                  await queryClient.invalidateQueries();
                } catch {
                  setError('Could not retry. Check the connection and try again.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  'Remove this local change? Keep a copy of its text if needed. This cannot be undone.',
                )
              )
                return;
              setError(null);
              try {
                await discard(entry.id);
              } catch {
                setError('Could not remove the change. Please try again.');
              }
            }}
          >
            <Trash2 className="size-4" />
            Remove change
          </Button>
        </div>
      ) : null}
    </li>
  );
}
