'use client';

import { uiEnglish } from '@/lib/ui-english';

import { KeyRound, MoreVertical, Pencil, Plus, ShieldOff, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { USER_STATUS_AR, formatLongDateAr, type UserSummary } from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, cn } from '@muhami/ui';
import { TemporaryPassword, UserFormSheet } from '@/components/admin/user-form-sheet';
import { SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import { useResetUserPassword, useRoles, useSetUserStatus, useUsers } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth-context';

/**
 * المستخدمون — who can get into this office.
 *
 * Every destructive action here (suspend, reset password) revokes sessions
 * server-side, so the row's "الجلسات النشطة" count is the honest feedback that
 * it actually happened.
 */
export default function UsersPage() {
  const { can } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<UserSummary | undefined>();

  const users = useUsers();
  const roles = useRoles();

  const items = users.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SettingsShell
      title="Accounts and permissions"
      subtitle="Create accounts for people who need access and choose what they can view and edit."
      permission="user:read"
      actions={
        can('user:invite') ? (
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add account
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <Card className="flex items-center justify-between gap-3 p-3.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Roles and permissions</p>
            <p className="text-xs text-ink-subtle">
              {roles.data ? `${roles.data.length} Roles` : 'Choose what each role can do'}
            </p>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/more/roles">Manage roles</Link>
          </Button>
        </Card>

        {users.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : users.isError ? (
          <ErrorState
            description={users.error instanceof ApiError ? users.error.messageAr : undefined}
            onRetry={() => void users.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No accounts recorded"
            description="Create accounts for employees who need sign-in access. Lawyer profiles are added separately in Office lawyers."
          />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={() => {
                    setEditing(user);
                    setSheetOpen(true);
                  }}
                />
              ))}
            </ul>
          </Card>
        )}

        {users.hasNextPage ? (
          <Button
            variant="secondary"
            block
            loading={users.isFetchingNextPage}
            onClick={() => void users.fetchNextPage()}
          >
            Show more
          </Button>
        ) : null}
      </div>

      <UserFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        user={editing}
        roles={roles.data ?? []}
      />
    </SettingsShell>
  );
}

function UserRow({ user, onEdit }: { user: UserSummary; onEdit: () => void }) {
  const { user: me, can } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState<string | null>(null);

  const setStatus = useSetUserStatus();
  const resetPassword = useResetUserPassword();

  const isSelf = me?.id === user.id;
  const suspended = user.status === 'SUSPENDED';

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setMenuOpen(false);
    try {
      await action();
    } catch (actionError) {
      setError(
        actionError instanceof ApiError ? actionError.messageAr : 'Could not complete the action.',
      );
    }
  };

  return (
    <li className="p-3.5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            suspended ? 'bg-surface-sunken text-ink-subtle' : 'bg-brand-subtle text-brand',
          )}
        >
          {user.fullName.trim().charAt(0)}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-ink">{user.fullName}</span>
            {isSelf ? <Badge tone="neutral">You</Badge> : null}
            <Badge tone={suspended ? 'danger' : 'success'}>{USER_STATUS_AR[user.status]}</Badge>
            <Badge tone="neutral">{uiEnglish(user.roleNameAr, user.roleNameAr)}</Badge>
          </div>

          <p dir="ltr" className="truncate text-start text-xs text-ink-muted">
            {user.email}
          </p>

          <p className="text-xs text-ink-subtle">
            {user.lastLoginAt
              ? `Last sign-in: ${formatLongDateAr(new Date(user.lastLoginAt))}`
              : 'Has not signed in yet'}
            {user.activeSessions > 0 ? ` · ${user.activeSessions} active session` : ''}
            {user.mustChangePassword ? ' - Password change required' : ''}
          </p>
        </div>

        {can('user:update') || can('user:deactivate') ? (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label={`Actions ${user.fullName}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
            >
              <MoreVertical className="size-5" />
            </button>

            {menuOpen ? (
              <>
                {/* Click-away catcher: cheaper and more reliable on touch than a
                    document listener that races the button's own click. */}
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute end-0 z-50 mt-1 w-56 overflow-hidden rounded-md border border-line bg-surface shadow-lg">
                  {can('user:update') ? (
                    <MenuItem
                      icon={Pencil}
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit();
                      }}
                    >
                      Edit details and role
                    </MenuItem>
                  ) : null}

                  {can('user:update') ? (
                    <MenuItem
                      icon={KeyRound}
                      onClick={() =>
                        void run(async () => {
                          const result = await resetPassword.mutateAsync(user.id);
                          setReset(result.temporaryPassword);
                        })
                      }
                    >
                      Reset password
                    </MenuItem>
                  ) : null}

                  {can('user:deactivate') && !isSelf ? (
                    <MenuItem
                      icon={suspended ? UserCheck : ShieldOff}
                      tone={suspended ? 'default' : 'danger'}
                      onClick={() =>
                        void run(() =>
                          setStatus.mutateAsync({
                            id: user.id,
                            status: suspended ? 'ACTIVE' : 'SUSPENDED',
                            version: user.version,
                          }),
                        )
                      }
                    >
                      {suspended ? 'Reactivate' : 'Disable account'}
                    </MenuItem>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {reset ? (
        <div className="mt-3 rounded-md border border-line bg-surface-sunken p-3">
          <TemporaryPassword
            name={user.fullName}
            password={reset}
            emailSent={false}
            onClose={() => setReset(null)}
          />
        </div>
      ) : null}
    </li>
  );
}

function MenuItem({
  icon: Icon,
  tone = 'default',
  onClick,
  children,
}: {
  icon: typeof Pencil;
  tone?: 'default' | 'danger';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm transition-colors hover:bg-surface-sunken',
        tone === 'danger' ? 'text-danger' : 'text-ink',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}
