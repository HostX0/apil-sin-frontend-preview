'use client';

import { uiEnglish } from '@/lib/ui-english';

import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  FileText,
  Home,
  CircleHelp,
  LogOut,
  MessageCircle,
  Search,
  Scale,
  Settings,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ComponentType } from 'react';
import { APP_SHORT_NAME_AR, type Permission } from '@/lib/ui-shared';
import { cn } from '@muhami/ui';
import { AccountAvatar } from '@/components/account/account-avatar';
import { DevsHubLogo as BrandLogo } from '@/components/brand/devshub-logo';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_PATH } from '@/lib/routes';

type PermissionGate = Permission | readonly Permission[];

interface NavLink {
  href: string;
  label: string;
  permission?: PermissionGate;
}

interface NavGroup {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  links: readonly NavLink[];
}

const GROUPS: readonly NavGroup[] = [
  {
    id: 'practice',
    label: 'Office files',
    icon: Scale,
    links: [
      { href: '/cases', label: 'Cases', permission: ['case:read.all', 'case:read.own'] },
      { href: '/clients', label: 'Clients', permission: 'client:read.all' },
      {
        href: '/more/lawyers',
        label: 'Office lawyers',
        permission: [
          'case:read.all',
          'case:read.own',
          'case:create',
          'case:assign',
          'user:read',
          'user:update',
          'whatsapp:send',
          'transaction:read',
          'transaction:create',
          'transaction:update',
        ],
      },
      { href: '/transactions', label: 'Transactions', permission: 'transaction:read' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'Communication',
    icon: MessageCircle,
    links: [{ href: '/whatsapp', label: 'Office WhatsApp', permission: 'whatsapp:read' }],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarDays,
    links: [
      { href: '/calendar', label: 'Calendar', permission: ['event:read.all', 'event:read.own'] },
      { href: '/tasks', label: 'Tasks', permission: 'task:read' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Wallet,
    links: [{ href: '/finance', label: 'Finance', permission: 'finance:read.summary' }],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    links: [{ href: '/documents', label: 'Document library', permission: 'document:read' }],
  },
  {
    id: 'insights',
    label: 'Reports and follow-up',
    icon: BarChart3,
    links: [
      { href: '/more/monitoring', label: 'Follow-up', permission: 'monitor:read' },
      { href: '/more/statistics', label: 'Office statistics', permission: 'monitor:read' },
      { href: '/more/archive', label: 'Archive', permission: 'case:read.all' },
    ],
  },
  {
    id: 'admin',
    label: 'Office administration',
    icon: Settings,
    links: [
      { href: '/more/office', label: 'My office', permission: 'office:read' },
      { href: '/more/users', label: 'Users and roles', permission: 'user:read' },
      { href: '/more/audit', label: 'Audit history', permission: 'audit:read' },
    ],
  },
];

export function ConsoleSidebar() {
  const pathname = usePathname();
  const { can, user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['insights', 'admin']));

  const permitted = (gate?: PermissionGate) =>
    !gate || (typeof gate === 'string' ? can(gate) : gate.some((permission) => can(permission)));

  const toggle = (id: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => permitted(link.permission)),
  })).filter((group) => group.links.length > 0);

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-e border-line bg-surface p-4 lg:flex lg:flex-col">
      <div className="mb-5 px-1 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo size={44} decorative />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink">{APP_SHORT_NAME_AR}</p>
            <p className="mt-1 truncate text-xs text-ink-muted" dir="auto">
              {user?.officeName ?? 'Office workspace'}
            </p>
          </div>
        </div>
      </div>

      {can('search:global') ? (
        <Link
          href="/search"
          className="mb-4 flex min-h-11 items-center gap-3 rounded-lg border border-line bg-surface-sunken px-3 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          <Search className="size-5" aria-hidden />
          <span className="flex-1">Search everything</span>
        </Link>
      ) : null}

      <nav
        aria-label="Workspace navigation"
        className="no-scrollbar flex-1 overflow-y-auto px-0.5 pb-3"
      >
        <Link
          href={DASHBOARD_PATH}
          aria-current={pathname === DASHBOARD_PATH ? 'page' : undefined}
          className={cn(
            'mb-2 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            pathname === DASHBOARD_PATH
              ? 'bg-brand-subtle font-semibold text-brand'
              : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
          )}
        >
          <Home className="size-5" aria-hidden />
          Dashboard
        </Link>

        {visibleGroups.map((group) => {
          const Icon = group.icon;
          const groupActive = group.links.some(
            (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
          );

          const isCollapsed = collapsed.has(group.id) && !groupActive;
          if (group.links.length === 1) {
            const link = group.links[0]!;
            return (
              <Link
                key={group.id}
                href={link.href}
                aria-current={groupActive ? 'page' : undefined}
                className={cn(
                  'mb-1.5 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                  groupActive
                    ? 'bg-brand-subtle font-semibold text-brand'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {link.label}
              </Link>
            );
          }
          return (
            <div key={group.id} className="mb-2">
              <button
                type="button"
                onClick={() => toggle(group.id)}
                aria-expanded={!isCollapsed}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-colors',
                  groupActive
                    ? 'text-ink'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                )}
              >
                <Icon className={cn('size-5', groupActive && 'text-brand')} aria-hidden />
                <span className="flex-1 text-start">{group.label}</span>
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isCollapsed && '-rotate-90',
                  )}
                  aria-hidden
                />
              </button>

              {!isCollapsed ? (
                <ul className="ms-5 mt-1 space-y-0.5 border-s border-line ps-3">
                  {group.links.map((link) => {
                    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition-colors',
                            active
                              ? 'bg-brand-subtle font-semibold text-brand'
                              : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                          )}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
        <Link
          href="/help"
          className="mt-4 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          aria-current={pathname === '/help' ? 'page' : undefined}
        >
          <CircleHelp className="size-5" aria-hidden />
          User guide
        </Link>
      </nav>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <Link
          href="/more/account"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 transition-colors hover:bg-surface-sunken"
          aria-label="Open account settings"
        >
          <AccountAvatar className="size-9" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-ink">{user?.fullName}</span>
            <span className="mt-0.5 block truncate text-xs text-ink-muted">
              {user?.roleNameAr ? uiEnglish(user.roleNameAr, user.roleNameAr) : ''}
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => void logout()}
          className="tap-target flex shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-subtle hover:text-danger"
        >
          <LogOut className="size-5" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
