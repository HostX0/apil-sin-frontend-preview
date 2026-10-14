'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  changePasswordSchema,
  formatLongDateAr,
  type ChangePasswordInput,
  type SessionSummary,
} from '@/lib/ui-shared';
import { Badge, Button, EmptyState, ErrorState, Field, Input, Skeleton } from '@muhami/ui';
import { SettingsSection, SettingsShell } from '@/components/settings/settings-shell';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

/**
 * الأمان والجلسات.
 *
 * Two things a user must be able to do without asking anyone: change their own
 * password, and end a session on a device they no longer have. Both are here.
 */
export default function SecurityPage() {
  return (
    <SettingsShell title="Security and sessions" subtitle="Password and signed-in devices">
      <div className="space-y-5">
        <ChangePasswordForm />
        <SessionsList />
      </div>
    </SettingsShell>
  );
}

function ChangePasswordForm() {
  const { logout } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: ChangePasswordInput) => api.post<void>('/auth/password/change', input),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
      // The API revokes every session on a password change, including this one.
      // Signing out here is honouring that, not an extra step.
      await logout();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.messageAr : 'Could not change the password.');
    }
  });

  return (
    <form method="post" onSubmit={onSubmit}>
      <SettingsSection
        title="Password"
        description="Changing the password ends all sessions, including this one. You will need to sign in again."
      >
        <Field label="Current password" required error={errors.currentPassword?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('currentPassword')}
              type="password"
              autoComplete="current-password"
            />
          )}
        </Field>

        <Field label="New password" required error={errors.newPassword?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('newPassword')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>

        <Field label="Confirm password" required error={errors.confirmPassword?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('confirmPassword')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>

        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <Button type="submit" loading={isSubmitting || mutation.isPending}>
          Change password
        </Button>
      </SettingsSection>
    </form>
  );
}

function SessionsList() {
  const queryClient = useQueryClient();
  const { logout, logoutEverywhere } = useAuth();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [endingAll, setEndingAll] = useState(false);

  const query = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => api.get<SessionSummary[]>('/auth/sessions'),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/auth/sessions/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });

  const endEverywhere = async () => {
    if (!window.confirm('Sign this account out on all devices, including this one?')) return;
    setBulkError(null);
    setEndingAll(true);
    try {
      await logoutEverywhere();
    } catch (error) {
      setBulkError(error instanceof ApiError ? error.messageAr : 'Could not end all sessions.');
    } finally {
      setEndingAll(false);
    }
  };

  const endSession = async (session: SessionSummary) => {
    setSessionError(null);
    try {
      if (session.current) await logout();
      else await revoke.mutateAsync(session.id);
    } catch (error) {
      setSessionError(error instanceof ApiError ? error.messageAr : 'Could not end the session.');
    }
  };

  return (
    <SettingsSection
      title="Signed-in devices"
      description="Review the devices and end sessions you do not recognise. Your current device is marked separately."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-warning-subtle p-3">
        <p className="min-w-0 flex-1 text-xs text-warning">
          If you suspect another person has access, change the password above to sign out every
          device.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="text-danger"
          loading={endingAll}
          onClick={() => void endEverywhere()}
        >
          <LogOut className="size-4" aria-hidden />
          End all sessions
        </Button>
      </div>

      {bulkError ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {bulkError}
        </p>
      ) : null}

      {sessionError ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {sessionError}
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon={MonitorSmartphone} title="No active sessions" />
      ) : (
        <ul className="divide-y divide-line">
          {(query.data ?? []).map((session) => (
            <li key={session.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <MonitorSmartphone className="size-5 shrink-0 text-ink-subtle" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  {session.deviceLabel ?? 'Unknown device'}
                  {session.current ? <Badge className="ms-2">This device</Badge> : null}
                </p>
                <p className="text-xs text-ink-subtle">
                  Last activity: {formatLongDateAr(new Date(session.lastUsedAt))}
                  {session.ip ? ` · ⁦${session.ip}⁩` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger"
                loading={revoke.isPending && revoke.variables === session.id}
                onClick={() => void endSession(session)}
              >
                <LogOut className="size-4" />
                {session.current ? 'Sign out' : 'End session'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
