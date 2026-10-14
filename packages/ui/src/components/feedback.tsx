import type { ComponentType, ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Loading placeholder. Shape-matched to the content it replaces, never a spinner. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-surface-sunken', className)} aria-hidden />
  );
}

/**
 * Empty state.
 *
 * Every list in this product has one. A screen showing "0" teaches nothing; a
 * screen that says what this is and offers the first action teaches the product.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-sunken">
          <Icon className="size-6 text-ink-subtle" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-base font-semibold text-ink">{title}</p>
        {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Inline error with a retry affordance — used by every data-fetching boundary. */
export function ErrorState({
  title = 'Could not load the information',
  description,
  onRetry,
  traceId,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  traceId?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-danger/30 bg-danger-subtle px-6 py-10 text-center">
      <p className="text-base font-semibold text-danger">{title}</p>
      {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="tap-target rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink"
        >
          Try again
        </button>
      ) : null}
      {traceId ? (
        <p className="ltr-numerals text-xs text-ink-subtle">
          Reference number: <span className="font-mono">{traceId}</span>
        </p>
      ) : null}
    </div>
  );
}
