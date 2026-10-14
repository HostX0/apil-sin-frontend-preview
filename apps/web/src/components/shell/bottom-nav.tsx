'use client';

import { CalendarDays, Home, MoreHorizontal, Scale, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import type { Permission } from '@muhami/shared';
import { cn } from '@muhami/ui';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_PATH } from '@/lib/routes';

type PermissionGate = Permission | readonly Permission[];

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission?: PermissionGate;
  match?: (pathname: string) => boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    href: DASHBOARD_PATH,
    label: 'Dashboard',
    icon: Home,
    match: (p) => p === DASHBOARD_PATH,
  },
  {
    href: '/cases',
    label: 'Cases',
    icon: Scale,
    permission: ['case:read.all', 'case:read.own'],
    match: (p) => p.startsWith('/cases'),
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: Users,
    permission: 'client:read.all',
    match: (p) => p.startsWith('/clients'),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: CalendarDays,
    permission: ['event:read.all', 'event:read.own'],
    match: (p) => p.startsWith('/calendar'),
  },
  {
    href: '/more',
    label: 'More',
    icon: MoreHorizontal,
    match: (p) =>
      [
        '/more',
        '/transactions',
        '/whatsapp',
        '/finance',
        '/documents',
        '/tasks',
        '/help',
        '/search',
        '/notifications',
      ].some((route) => p === route || p.startsWith(route + '/')),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { can } = useAuth();

  const permitted = (gate?: PermissionGate) =>
    !gate || (typeof gate === 'string' ? can(gate) : gate.some((permission) => can(permission)));

  const visible = NAV_ITEMS.filter((item) => permitted(item.permission));

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-safe-bottom lg:hidden"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around gap-1 px-2 py-1">
        {visible.map((item) => {
          const active = item.match?.(pathname) ?? pathname === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tap-target flex h-nav flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors',
                  active
                    ? 'bg-brand-subtle font-semibold text-brand'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
