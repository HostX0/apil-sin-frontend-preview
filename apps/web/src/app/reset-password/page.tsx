'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { APP_NAME_AR, resetPasswordSchema, type ResetPasswordInput } from '@/lib/ui-shared';
import { Button, Card, CardContent, EmptyState, Field, Input, Skeleton } from '@muhami/ui';
import { ApiError, api } from '@/lib/api-client';

/**
 * تعيين كلمة مرور جديدة برمز.
 *
 * The token arrives in the query string, so this page must be wrapped in
 * `Suspense` — `useSearchParams` opts a route into client rendering and Next
 * fails the build without a boundary.
 *
 * On success it sends the user to the login screen rather than signing them in.
 * A reset is performed exactly when the previous password is believed
 * compromised; proving the new one works is worth one extra step.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <Skeleton className="h-64 w-full max-w-sm" />
    </main>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/password/reset', values);
      setDone(true);
      setTimeout(() => router.replace('/login'), 2500);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.messageAr : 'Could not reset your password.');
    }
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center font-display text-2xl font-bold text-ink">{APP_NAME_AR}</h1>

        <Card>
          <CardContent className="space-y-4 pt-4">
            {!token ? (
              <EmptyState
                title="Incomplete link"
                description="Open the complete link from the email, or request a new link."
                action={
                  <Button size="sm" asChild>
                    <Link href="/forgot-password">Request a new link</Link>
                  </Button>
                }
              />
            ) : done ? (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
                <p className="text-sm text-ink">CA Change password.</p>
                <p className="text-xs text-ink-subtle">
                  Use your new password to sign in. The sign-in page opens automatically.
                </p>
                <Button size="sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            ) : (
              <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-ink">New password</h2>
                  <p className="text-xs text-ink-subtle">
                    Changing your password signs you out on every device.
                  </p>
                </div>

                <input type="hidden" {...register('token')} />

                <Field
                  label="New password"
                  required
                  error={errors.newPassword?.message}
                  hint="At least 10 characters or numbers."
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register('newPassword')}
                      type="password"
                      autoComplete="new-password"
                      autoFocus
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
                  <p
                    role="alert"
                    className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger"
                  >
                    {formError}
                  </p>
                ) : null}

                <Button type="submit" block loading={isSubmitting}>
                  Set password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
