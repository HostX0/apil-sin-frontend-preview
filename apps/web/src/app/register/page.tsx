'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  APP_NAME_AR,
  APP_SHORT_NAME_AR,
  APP_TAGLINE_AR,
  registerOfficeSchema,
  type RegisterOfficeInput,
} from '@/lib/ui-shared';
import { Button, Card, CardContent, Field, Input } from '@muhami/ui';
import { ApiError, api } from '@/lib/api-client';
import { AuthShell } from '@/components/auth/auth-shell';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_PATH } from '@/lib/routes';

/**
 * إنشاء مكتب جديد.
 *
 * One request creates the office, seeds the five roles and creates the first
 * OWNER — all in one transaction server-side (Phase 2), because a half-created
 * office is worse than a failed signup.
 *
 * The response carries a session, so the new owner lands inside the app rather
 * than on a login screen typing the password they set nine seconds ago.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterOfficeInput>({ resolver: zodResolver(registerOfficeSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await api.post('/auth/register-office', values);
      await refresh();
      router.replace(DASHBOARD_PATH);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          setError(field as keyof RegisterOfficeInput, { message: messages[0] });
        }
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
      } else {
        setFormError('Could not create the office. Please try again.');
      }
    }
  });

  if (process.env.NEXT_PUBLIC_REGISTRATION_ENABLED !== 'true') {
    return (
      <AuthShell
        eyebrow={`The team at ${APP_SHORT_NAME_AR}`}
        title="Sign in to the office account"
        description="The office administrator creates team accounts. Ask them for your sign-in details."
      >
        <Button asChild block>
          <Link href="/login">Sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <Image
            src="/icons/devshub-192.png"
            alt=""
            width={56}
            height={56}
            priority
            className="mx-auto rounded-2xl"
          />
          <h1 className="font-display text-2xl font-bold text-ink">{APP_NAME_AR}</h1>
          <p className="text-sm text-ink-muted">{APP_TAGLINE_AR}</p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-ink">Create an office</h2>
              <p className="text-xs text-ink-subtle">
                This account becomes the office owner and can manage all features, including team
                accounts.
              </p>
            </div>

            <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
              <Field label="Office name" required error={errors.officeName?.message}>
                {(props) => (
                  <Input
                    {...props}
                    {...register('officeName')}
                    autoComplete="organization"
                    placeholder="Your law office"
                  />
                )}
              </Field>

              <Field label="Lawyer name" required error={errors.lawyerName?.message}>
                {(props) => <Input {...props} {...register('lawyerName')} autoComplete="name" />}
              </Field>

              <Field label="Email" required error={errors.email?.message} hint="Used to sign in.">
                {(props) => (
                  <Input
                    {...props}
                    {...register('email')}
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    dir="ltr"
                    className="text-start"
                    placeholder="name@office.iq"
                  />
                )}
              </Field>

              <Field label="Mobile number" error={errors.phone?.message}>
                {(props) => (
                  <Input
                    {...props}
                    {...register('phone')}
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    className="text-start"
                    placeholder="07XXXXXXXXX"
                  />
                )}
              </Field>

              <Field
                label="Password"
                required
                error={errors.password?.message}
                hint="At least 10 characters or numbers."
              >
                {(props) => (
                  <Input
                    {...props}
                    {...register('password')}
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
                Create the office
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-ink-subtle">
          Already have an office?{' '}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
