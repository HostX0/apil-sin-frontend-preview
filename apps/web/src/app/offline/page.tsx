import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Disconnected' };

/** Served by the service worker when a navigation fails with no network. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-surface-sunken">
        <WifiOff className="size-6 text-ink-subtle" />
      </div>
      <h1 className="font-display text-xl font-bold text-ink">No internet connection</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        Could not open this page. Check your internet connection, then try again.
      </p>
      <p className="max-w-sm text-xs text-ink-subtle">
        If you made a change while offline, review Pending changes once you reconnect to confirm it
        was saved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-ink"
      >
        Return to the office
      </Link>
    </main>
  );
}
