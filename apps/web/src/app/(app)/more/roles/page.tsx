'use client';

import { uiEnglish } from '@/lib/ui-english';

import { Lock, Plus, RotateCcw, Shield, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_GROUP_AR,
  PERMISSION_META,
  type Permission,
  type PermissionGroup,
  type RoleSummary,
} from '@/lib/ui-shared';
import { Badge, Button, Card, ErrorState, Field, Input, Skeleton, cn } from '@muhami/ui';
import { SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import {
  useCreateRole,
  useRemoveRole,
  useResetRole,
  useRoles,
  useUpdateRole,
} from '@/lib/api/admin';
import { useAuth } from '@/lib/auth-context';

/** Permissions grouped for display, computed once from the registry. */
const BY_GROUP: Record<PermissionGroup, Permission[]> = PERMISSION_GROUPS.reduce(
  (accumulator, group) => {
    accumulator[group] = PERMISSIONS.filter(
      (permission) => PERMISSION_META[permission].group === group,
    );
    return accumulator;
  },
  {} as Record<PermissionGroup, Permission[]>,
);

/**
 * الأدوار والصلاحيات.
 *
 * The matrix is generated from the permission registry, not hand-written. A
 * permission added in any future phase appears here automatically with its
 * Arabic label and its group — which is the whole reason permissions are data.
 */
export default function RolesPage() {
  const { can } = useAuth();
  const query = useRoles();
  const [creating, setCreating] = useState(false);

  return (
    <SettingsShell
      title="Roles and permissions"
      subtitle="What each role can do in the office."
      permission="role:read"
      actions={
        can('role:create') ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New role
          </Button>
        ) : null
      }
    >
      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="space-y-3">
          {creating ? <NewRoleCard onDone={() => setCreating(false)} /> : null}
          {(query.data ?? []).map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}
    </SettingsShell>
  );
}

function RoleCard({ role }: { role: RoleSummary }) {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<Permission>>(new Set(role.permissions));
  const [error, setError] = useState<string | null>(null);

  const update = useUpdateRole();
  const reset = useResetRole();
  const remove = useRemoveRole();

  // OWNER is defined as "all permissions" and is not editable — removing
  // user:update from it is the fastest way to lock an office out of itself.
  const isOwner = role.key === 'OWNER';
  const editable = can('role:update') && !isOwner;

  const dirty = useMemo(
    () =>
      selected.size !== role.permissions.length ||
      role.permissions.some((permission) => !selected.has(permission)),
    [selected, role.permissions],
  );

  const toggle = (permission: Permission) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  };

  const toggleGroup = (group: PermissionGroup, on: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const permission of BY_GROUP[group]) {
        if (on) next.add(permission);
        else next.delete(permission);
      }
      return next;
    });
  };

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(
        actionError instanceof ApiError ? actionError.messageAr : 'Could not complete the action.',
      );
    }
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3.5 text-start transition-colors hover:bg-surface-sunken"
      >
        <Shield className="size-5 shrink-0 text-ink-subtle" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-ink">
              {uiEnglish(role.nameAr, role.nameAr)}
            </span>
            {role.isSystem ? (
              <Badge tone="neutral">Default</Badge>
            ) : (
              <Badge tone="brand">Custom</Badge>
            )}
            {isOwner ? (
              <Badge tone="warning">
                <Lock className="size-3" />
                Cannot be edited
              </Badge>
            ) : null}
          </div>
          {role.descriptionAr ? (
            <p className="mt-0.5 text-xs text-ink-subtle">
              {uiEnglish(role.descriptionAr, role.descriptionAr)}
            </p>
          ) : null}
        </div>
        <span className="ltr-numerals shrink-0 text-xs text-ink-subtle">
          {isOwner
            ? 'All permissions'
            : `${role.permissions.length} ${role.permissions.length === 1 ? 'permission' : 'permissions'}`}{' '}
          · {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-line p-3.5">
          {isOwner ? (
            <p className="rounded-md bg-surface-sunken p-3 text-xs text-ink-muted">
              The office owner has every permission, including future additions. This role cannot be
              edited.
            </p>
          ) : (
            PERMISSION_GROUPS.map((group) => {
              const permissions = BY_GROUP[group];
              if (permissions.length === 0) return null;
              const allOn = permissions.every((permission) => selected.has(permission));

              return (
                <section key={group} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                      {PERMISSION_GROUP_AR[group]}
                    </h3>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group, !allOn)}
                        className="text-xs text-brand hover:underline"
                      >
                        {allOn ? 'Clear all' : 'Select all'}
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {permissions.map((permission) => (
                      <label
                        key={permission}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-md p-2 text-sm transition-colors',
                          selected.has(permission)
                            ? 'bg-brand-subtle/40'
                            : 'hover:bg-surface-sunken',
                          !editable && 'cursor-default',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(permission)}
                          disabled={!editable}
                          onChange={() => toggle(permission)}
                          className="size-4 shrink-0 accent-brand"
                        />
                        <span className="min-w-0 flex-1 text-ink">
                          {PERMISSION_META[permission].ar}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })
          )}

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          {editable ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <Button
                size="sm"
                disabled={!dirty}
                loading={update.isPending}
                onClick={() =>
                  void run(() =>
                    update.mutateAsync({
                      id: role.id,
                      permissions: [...selected],
                      version: role.version,
                    }),
                  )
                }
              >
                Save permissions
              </Button>

              {dirty ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(new Set(role.permissions))}
                >
                  Undo
                </Button>
              ) : null}

              {role.isSystem ? (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={reset.isPending}
                  onClick={() => void run(() => reset.mutateAsync(role.id))}
                >
                  <RotateCcw className="size-4" />
                  Restore defaults
                </Button>
              ) : can('role:delete') ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  loading={remove.isPending}
                  onClick={() => void run(() => remove.mutateAsync(role.id))}
                >
                  <Trash2 className="size-4" />
                  Delete role
                </Button>
              ) : null}

              {/* Stated up front: this is a live privilege change, not a draft. */}
              <p className="w-full text-xs text-ink-subtle">
                Reducing permissions immediately ends sessions for users with this role so the
                changes take effect.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function NewRoleCard({ onDone }: { onDone: () => void }) {
  const create = useCreateRole();
  const [key] = useState(
    () => `CUSTOM_${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`,
  );
  const [nameAr, setNameAr] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await create.mutateAsync({ key, nameAr, permissions: [] });
      onDone();
    } catch (createError) {
      setError(
        createError instanceof ApiError ? createError.messageAr : 'Could not create the role.',
      );
    }
  };

  return (
    <Card className="space-y-3 border-brand/40 p-3.5">
      <p className="text-sm font-semibold text-ink">New role</p>
      <p className="text-xs text-ink-subtle">
        Enter a role name and select its permissions. No permissions are granted until selected and
        saved.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Role name" required>
          {(props) => (
            <Input
              {...props}
              value={nameAr}
              onChange={(event) => setNameAr(event.target.value)}
              placeholder="Example: Office manager"
            />
          )}
        </Field>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          size="sm"
          loading={create.isPending}
          disabled={nameAr.trim().length < 2}
          onClick={() => void submit()}
        >
          Create
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
