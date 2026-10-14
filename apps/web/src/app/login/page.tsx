'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@muhami/shared';
import { Button, Field, Input } from '@muhami/ui';
import { AuthShell } from '@/components/auth/auth-shell';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_PATH } from '@/lib/routes';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  useEffect(() => {
    if (!isLoading && user) router.replace(DASHBOARD_PATH);
  }, [isLoading, user, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      router.replace(DASHBOARD_PATH);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field === 'email' || field === 'password') {
            setError(field, { message: messages[0] });
          }
        }
        setFormError(Object.keys(error.fieldErrors).length === 0 ? error.messageAr : null);
      } else {
        setFormError('Could not sign in. Please try again.');
      }
    }
  });

  return (
    <AuthShell
      eyebrow=""
      title="Sign in"
      description="Enter your username and password to continue."
      footer={
        process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === 'true' ? (
          <>
            Do not have an office yet?{' '}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              Create an office
            </Link>
          </>
        ) : (
          <Link href="/dashboard" className="font-semibold text-brand hover:underline">
            Open frontend preview
          </Link>
        )
      }
    >
      <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Username" required error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('email')}
              type="text"
              inputMode="email"
              autoComplete="username"
              dir="ltr"
            />
          )}
        </Field>

        <Field label="Password" required error={errors.password?.message}>
          {(props) => (
            <div className="relative">
              <Input
                {...props}
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pe-12"
                onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                onBlur={() => setCapsLock(false)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="tap-target absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-md text-ink-subtle transition-colors hover:text-brand"
              >
                {showPassword ? (
                  <EyeOff className="size-[1.1rem]" aria-hidden />
                ) : (
                  <Eye className="size-[1.1rem]" aria-hidden />
                )}
              </button>
            </div>
          )}
        </Field>

        {capsLock ? (
          <p role="status" className="text-xs font-medium text-warning">
            Caps Lock is enabled.
          </p>
        ) : null}

        {formError ? (
          <p role="alert" className="rounded-xl bg-danger-subtle px-3 py-2.5 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <div className="space-y-1">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
            <input
              {...register('rememberMe')}
              type="checkbox"
              className="size-5 rounded border-line-strong accent-[rgb(var(--color-brand))]"
              aria-describedby="remember-me-help"
              disabled={isSubmitting}
            />
            Keep me signed in
          </label>
          <p id="remember-me-help" className="text-xs text-ink-subtle">
            Uncheck this option on a shared device.
          </p>
        </div>

        <Button type="submit" block size="lg" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
