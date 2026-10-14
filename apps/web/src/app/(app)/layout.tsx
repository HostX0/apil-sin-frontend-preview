'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Skeleton } from '@muhami/ui';
import { OfflineBar } from '@/components/pwa/offline-bar';
import { AppHeader } from '@/components/shell/app-header';
import { BottomNav } from '@/components/shell/bottom-nav';
import { ConsoleSidebar } from '@/components/shell/console-sidebar';
import { useAuth } from '@/lib/auth-context';

/**
 * Authenticated shell.
 *
 * One route tree, tuned for two contexts: a focused mobile workspace and a
 * generous desktop console. Visual depth is deliberately CSS-only so the shell
 * stays instant and does not ship an animation runtime to every page.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  if (isLoading) return <ShellSkeleton />;
  if (!user) return null;

  return (
    <div className="relative flex min-h-dvh">
      <ConsoleSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="lg:hidden">
          <AppHeader />
        </div>

        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900" role="status">
          Preview · Sample data only · Changes reset when this page reloads
        </div>
        <OfflineBar />

        <main className="relative mx-auto w-full max-w-[1440px] flex-1 px-3.5 pb-[calc(theme(spacing.nav)+1.5rem)] pt-4 sm:px-5 lg:px-8 lg:pb-10 lg:pt-7 xl:px-10">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 p-4 sm:p-5 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="size-11 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}
