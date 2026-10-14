'use client';

import { Bell, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { APP_SHORT_NAME_AR, APP_TIMEZONE, formatLongDateAr, toArabicDigits } from '@/lib/ui-shared';
import { DevsHubLogo as BrandLogo } from '@/components/brand/devshub-logo';
import { useUnreadCount } from '@/lib/api/notifications';
import { useAuth } from '@/lib/auth-context';

/**
 * Compact mobile command bar. It keeps the office identity visible while the
 * search and notification actions remain single-tap targets.
 */
export function AppHeader() {
  const { can } = useAuth();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const time = now
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: APP_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(now)
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface pt-safe-top">
      <div className="mx-auto flex min-h-[4.4rem] max-w-[1440px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
        <Link href="/more/account" aria-label="My account" className="shrink-0 rounded-full">
          <BrandLogo size={44} decorative />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-display text-sm font-bold leading-5 text-ink sm:text-base">
            {APP_SHORT_NAME_AR}
          </p>
          <p
            className="mt-1 hidden truncate text-xs text-ink-muted min-[350px]:block"
            suppressHydrationWarning
          >
            {now ? (
              <>
                {formatLongDateAr(now)}
                {time ? <span className="mx-1.5 text-line-strong">·</span> : null}
                <span>{time}</span>
              </>
            ) : (
              ' '
            )}
          </p>
        </div>

        {can('search:global') ? (
          <Link
            href="/search"
            aria-label="Global search"
            className="tap-target flex shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Search className="size-5" aria-hidden />
          </Link>
        ) : null}

        <NotificationBell />
      </div>
    </header>
  );
}

function NotificationBell() {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `Notifications — ${count} unread` : 'Notifications'}
      className="tap-target relative flex shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      <Bell className="size-5" aria-hidden />
      {count > 0 ? (
        <span className="ltr-numerals absolute end-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-bold leading-4 text-danger-ink ring-2 ring-surface">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}

export function useNumeralFormatter(): (value: number | string) => string {
  const { user } = useAuth();
  const useArabicNumerals = user?.preferences?.['numerals'] === 'arabic';

  return (value) => {
    const text = typeof value === 'number' ? value.toLocaleString('en-US') : value;
    return useArabicNumerals ? toArabicDigits(text) : text;
  };
}
