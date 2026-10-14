'use client';

import { uiEnglish } from '@/lib/ui-english';

import {
  Archive,
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  CloudOff,
  DatabaseBackup,
  FileText,
  Landmark,
  ListTodo,
  Mail,
  MessageCircle,
  LogOut,
  CircleHelp,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { APP_NAME_AR, type Permission, type WatchlistCounts } from '@/lib/ui-shared';
import { Button, Card, cn } from '@muhami/ui';
import { AccountAvatar } from '@/components/account/account-avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useWatchlistCounts } from '@/lib/api/notifications';
import { useAuth } from '@/lib/auth-context';

/**
 * More — the structure specified in the brief:
 * My Office · Tools · Monitoring · Office Settings.
 *
 * Rows whose permission the user lacks are removed, and a section with no
 * remaining rows disappears with them.
 */
interface Row {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  description?: string;
  ownerOnly?: boolean;
  /** Some supporting screens are shared by both "read all" and "read own" users. */
  permissionsAny?: readonly Permission[];
}

interface Section {
  title: string;
  description: string;
  collapsible?: boolean;
  rows: readonly Row[];
}

const SECTIONS: readonly Section[] = [
  {
    title: 'Office tools',
    description: 'Everyday tools for office work and communication.',
    rows: [
      {
        href: '/whatsapp',
        label: 'WhatsApp messages',
        icon: MessageCircle,
        permission: 'whatsapp:read',
      },
      {
        href: '/transactions',
        label: 'Transactions',
        icon: FileText,
        permission: 'transaction:read',
      },
      {
        href: '/more/lawyers',
        label: 'Office lawyers',
        icon: Users,
        permissionsAny: [
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
      { href: '/tasks', label: 'Tasks and follow-up', icon: ListTodo, permission: 'task:read' },
      { href: '/search', label: 'Search the office', icon: Search, permission: 'search:global' },
      {
        href: '/more/courts',
        label: 'Courts and authorities',
        icon: Landmark,
        permissionsAny: ['case:read.all', 'case:read.own'],
      },
      { href: '/help', label: 'User guide', icon: CircleHelp },
    ],
  },
  {
    title: 'Follow-up and reports',
    description: 'Files needing attention, office statistics and archives.',
    collapsible: true,
    rows: [
      {
        href: '/more/monitoring/no-fee-agreement',
        label: 'Cases without fee agreements',
        icon: FileText,
        permission: 'monitor:read',
      },
      {
        href: '/more/monitoring/no-certified-poa',
        label: 'Cases without certified powers of attorney',
        icon: ShieldCheck,
        permission: 'monitor:read',
      },
      {
        href: '/more/monitoring/outstanding-fees',
        label: 'Remaining fees',
        icon: BarChart3,
        permission: 'monitor:read',
      },
      {
        href: '/more/monitoring/inactive-cases',
        label: 'Cases without recent activity',
        icon: Archive,
        permission: 'monitor:read',
      },
      {
        href: '/more/statistics',
        label: 'Office statistics',
        icon: BarChart3,
        permission: 'monitor:read',
      },
      {
        href: '/more/archive',
        label: 'Archived cases',
        icon: Archive,
        permission: 'case:read.all',
      },
    ],
  },
  {
    title: 'Office administration',
    description: 'Company details, employee accounts and backups.',
    collapsible: true,
    rows: [
      {
        href: '/more/office',
        label: 'Office details and logo',
        icon: Building2,
        permission: 'office:read',
      },
      {
        href: '/more/users',
        label: 'Accounts and permissions',
        icon: Users,
        permission: 'user:read',
      },
      {
        href: '/more/settings',
        label: 'Office and print settings',
        icon: Settings2,
        permission: 'settings:read',
      },
      {
        href: '/more/mailboxes',
        label: 'Employee email',
        description: 'Create employee email addresses and set passwords',
        icon: Mail,
        permission: 'settings:update',
        ownerOnly: true,
      },
      {
        href: '/more/audit',
        label: 'Office change history',
        icon: ScrollText,
        permission: 'audit:read',
      },
      {
        href: '/more/backup',
        label: 'Backups and export',
        icon: DatabaseBackup,
        permission: 'backup:run',
      },
    ],
  },
  {
    title: 'My settings',
    description: 'Your account, devices, notifications and pending changes.',
    collapsible: true,
    rows: [
      { href: '/more/account', label: 'My account and photo', icon: UserRound },
      { href: '/more/security', label: 'Password and devices', icon: ShieldCheck },
      { href: '/more/notifications', label: 'My notification settings', icon: Bell },
      { href: '/more/pending', label: 'Pending changes', icon: CloudOff },
    ],
  },
];

export default function MorePage() {
  const { user, can, logout } = useAuth();

  // Real counts, so the badges say something rather than decorating.
  const counts = useWatchlistCounts(can('monitor:read'));

  const badgeFor = (href: string): number | undefined => {
    const map: Record<string, keyof WatchlistCounts> = {
      '/more/monitoring/no-fee-agreement': 'NO_FEE_AGREEMENT',
      '/more/monitoring/no-certified-poa': 'NO_CERTIFIED_POA',
      '/more/monitoring/outstanding-fees': 'OUTSTANDING_FEES',
      '/more/monitoring/inactive-cases': 'INACTIVE_CASES',
    };
    const key = map[href];
    return key ? counts.data?.[key] : undefined;
  };

  const sections = SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      if (row.ownerOnly && user?.roleKey !== 'OWNER') return false;
      if (row.permission && !can(row.permission)) return false;
      if (row.permissionsAny && !row.permissionsAny.some((permission) => can(permission)))
        return false;
      return true;
    }),
  })).filter((section) => section.rows.length > 0);

  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-3 p-4">
        <Link href="/more/account" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
          <AccountAvatar className="size-11" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{user?.fullName}</span>
            <span className="block truncate text-xs text-ink-subtle">
              {user?.roleNameAr ? uiEnglish(user.roleNameAr, user.roleNameAr) : ''} ·{' '}
              {user?.officeName}
            </span>
          </span>
        </Link>
        <ThemeToggle />
      </Card>

      <div>
        <h1 className="font-display text-xl font-bold text-ink">More</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Choose a tool for daily work, or open administration when needed.
        </p>
      </div>

      {sections.map((section) => {
        const attentionCount = section.rows.reduce(
          (total, row) => total + (badgeFor(row.href) ?? 0),
          0,
        );
        const rows = (
          <ul className="divide-y divide-line">
            {section.rows.map((row) => {
              const Icon = row.icon;
              const badge = badgeFor(row.href);
              return (
                <li key={row.href}>
                  <Link
                    href={row.href}
                    className="flex min-h-12 items-center gap-3 p-3.5 transition-colors hover:bg-surface-sunken"
                  >
                    <Icon aria-hidden className="size-5 shrink-0 text-ink-subtle" />
                    <span className="min-w-0 flex-1 text-sm text-ink">
                      <span className="block">{row.label}</span>
                      {row.description ? (
                        <span className="mt-1 block text-xs leading-5 text-ink-subtle">
                          {row.description}
                        </span>
                      ) : null}
                    </span>
                    {badge !== undefined ? (
                      <span
                        className={cn(
                          'ltr-numerals shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                          badge > 0
                            ? 'bg-warning-subtle text-warning'
                            : 'bg-success-subtle text-success',
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-subtle" />
                  </Link>
                </li>
              );
            })}
          </ul>
        );
        return section.collapsible ? (
          <details
            key={section.title}
            id={section.title === 'Follow-up and reports' ? 'monitoring' : undefined}
            className="group scroll-mt-24 rounded-xl border border-line bg-surface"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-ink">{section.title}</h2>
                <p className="mt-1 text-xs leading-5 text-ink-subtle">{section.description}</p>
              </div>
              {attentionCount > 0 ? (
                <span className="shrink-0 rounded-full bg-warning-subtle px-2 py-1 text-xs text-warning">
                  {attentionCount} To follow up
                </span>
              ) : null}
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-90"
              />
            </summary>
            <div className="border-t border-line">{rows}</div>
          </details>
        ) : (
          <section key={section.title} className="space-y-2">
            <h2 className="px-1 text-sm font-semibold text-ink">{section.title}</h2>
            <Card>{rows}</Card>
          </section>
        );
      })}

      <Button variant="secondary" block onClick={() => void logout()}>
        <LogOut className="size-4" />
        Sign out
      </Button>

      <p className="pb-2 text-center text-xs text-ink-subtle">{APP_NAME_AR}</p>
    </div>
  );
}
