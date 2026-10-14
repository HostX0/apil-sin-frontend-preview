'use client';

import { uiSystemText } from '@/lib/ui-english';

import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_AR,
  AUDIT_ENTITY_AR,
  formatLongDateAr,
  type AuditAction,
  type AuditEntryItem,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, cn } from '@muhami/ui';
import { SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import { useAuditActors, useAuditLog } from '@/lib/api/admin';

/**
 * سجل التدقيق.
 *
 * Read-only by construction: there is no write, update or delete path anywhere
 * in the codebase, and only OWNER holds `audit:read`. An audit log the audited
 * can curate is decoration.
 */
export default function AuditPage() {
  const [action, setAction] = useState<AuditAction | ''>('');
  const [actorId, setActorId] = useState('');

  const filters = {
    ...(action ? { action } : {}),
    ...(actorId ? { actorId } : {}),
  };

  const query = useAuditLog(filters);
  const actors = useAuditActors();

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SettingsShell
      title="Audit history"
      subtitle="Every change, who made it and when"
      permission="audit:read"
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as AuditAction | '')}
            aria-label="Filter by action"
            className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {AUDIT_ACTION_AR[value]}
              </option>
            ))}
          </select>

          <select
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            aria-label="Filter by user"
            className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
          >
            <option value="">All users</option>
            {(actors.data ?? []).map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.label}
              </option>
            ))}
          </select>
        </div>

        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            description={query.error instanceof ApiError ? query.error.messageAr : undefined}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No records"
            description="No events match these filters."
          />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {items.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
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
        ) : null}
      </div>
    </SettingsShell>
  );
}

/** Actions that deserve to be noticed at a glance, not just listed. */
const TONE: Partial<Record<AuditAction, 'danger' | 'warning' | 'success'>> = {
  DELETE: 'danger',
  LOGIN_FAILED: 'danger',
  VOID: 'danger',
  PERMISSION_CHANGE: 'warning',
  PASSWORD_RESET: 'warning',
  SESSION_REVOKE: 'warning',
  EXPORT: 'warning',
  RESTORE: 'success',
};

function AuditRow({ entry }: { entry: AuditEntryItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = entry.changes.length > 0;

  return (
    <li className="p-3.5">
      <div className="flex items-start gap-3">
        <Badge tone={TONE[entry.action] ?? 'neutral'}>{AUDIT_ACTION_AR[entry.action]}</Badge>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm text-ink">
            {entry.summaryAr
              ? uiSystemText(entry.summaryAr)
              : (AUDIT_ENTITY_AR[entry.entityType] ?? entry.entityType)}
          </p>
          <p className="text-xs text-ink-subtle">
            {entry.actorLabel ?? 'System'} · {formatLongDateAr(new Date(entry.createdAt))}
            {/* The IP is isolated so its dots are not reordered in an RTL line. */}
            {entry.ip ? ` · ⁦${entry.ip}⁩` : ''}
          </p>

          {hasChanges ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="text-xs text-brand hover:underline"
            >
              {expanded ? 'Hide details' : `View changes (${entry.changes.length})`}
            </button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <dl className="mt-2 space-y-1.5 rounded-md bg-surface-sunken p-3">
          {entry.changes.map((change) => (
            <div key={change.field} className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
              <dt className="font-mono text-ink-subtle">{change.field}</dt>
              <dd className="min-w-0">
                <span className={cn('break-words text-danger line-through')}>
                  {change.before ?? '—'}
                </span>
                <span aria-hidden className="mx-1.5 text-ink-subtle">
                  ←
                </span>
                <span className="break-words text-success">{change.after ?? '—'}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}
