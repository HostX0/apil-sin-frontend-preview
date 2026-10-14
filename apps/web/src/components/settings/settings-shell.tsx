'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Permission } from '@muhami/shared';
import { Card, EmptyState, cn } from '@muhami/ui';
import { useAuth } from '@/lib/auth-context';

/**
 * The frame every settings screen shares: back affordance, title, subtitle, and
 * a permission gate.
 *
 * The gate matters more than the chrome. These routes are reachable by typing a
 * URL, and the API would refuse the request anyway — but a screen that renders
 * its shell and then fills with permission errors reads as a broken app rather
 * than a closed door. This says the true thing immediately.
 */
export function SettingsShell({
  title,
  subtitle,
  permission,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  permission?: Permission;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const { can } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
        >
          {/* Forward in RTL is left; the icon is already pointing the right way. */}
          <ArrowRight className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-bold text-ink lg:text-xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-ink-subtle">{subtitle}</p> : null}
        </div>
        {actions}
      </div>

      {permission && !can(permission) ? (
        <Card className="p-6">
          <EmptyState
            title="You do not have access"
            description="Ask the office owner if you need this screen."
          />
        </Card>
      ) : (
        children
      )}
    </div>
  );
}

/** A titled group of settings rows — the visual unit the settings screens repeat. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-subtle">{description}</p> : null}
      </div>
      <Card className="space-y-4 p-4">{children}</Card>
    </section>
  );
}

/** Label + control on one line, stacking on narrow screens. */
export function SettingRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint ? <p className="text-xs text-ink-subtle">{hint}</p> : null}
      </div>
      <div className="shrink-0 sm:w-56">{control}</div>
    </div>
  );
}

/**
 * An accessible on/off control.
 *
 * A native checkbox styled as a switch, not a div with a click handler: it
 * keeps keyboard focus, the space key, and the screen-reader announcement for
 * free, which a div would each have to re-implement and usually gets wrong.
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 sm:justify-end">
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      {/* The knob is a descendant, so its "on" position has to be selected
          through the track — `peer-checked:` alone only reaches siblings.
          Transforms are not mirrored by `dir`, so RTL needs the opposite sign
          to travel the same visual direction. */}
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition-colors',
          'peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-disabled:opacity-50',
          'peer-checked:[&>span]:translate-x-5 rtl:peer-checked:[&>span]:-translate-x-5 peer-checked:[&>span]:bg-brand-ink',
        )}
      >
        <span className="absolute start-0.5 top-0.5 size-5 rounded-full bg-ink-muted transition-[transform,background-color]" />
      </span>
    </label>
  );
}
