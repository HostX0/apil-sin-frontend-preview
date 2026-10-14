'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { Bell, Camera, KeyRound, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
  accountProfileSchema,
  type AccountProfile,
  type AccountProfileInput,
} from '@muhami/shared';
import { Button, Card, ErrorState, Field, Input, Skeleton } from '@muhami/ui';
import { SettingsSection, SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import {
  useAccountProfile,
  useRemoveAvatar,
  useUpdateAccountProfile,
  useUploadAvatar,
} from '@/lib/api/account';

export default function AccountPage() {
  const query = useAccountProfile();

  return (
    <SettingsShell title="My account" subtitle="Your personal details and account photo">
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : query.data ? (
        <div className="space-y-5">
          <AvatarSection profile={query.data} />
          <ProfileForm profile={query.data} />
          <AccountLinks />
        </div>
      ) : null}
    </SettingsShell>
  );
}

function AvatarSection({ profile }: { profile: AccountProfile }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!AVATAR_MIME_TYPES.includes(file.type as (typeof AVATAR_MIME_TYPES)[number])) {
      setError('Unsupported format. Choose PNG, JPEG or WebP.');
      return;
    }

    try {
      await upload.mutateAsync(file);
    } catch (uploadError) {
      setError(
        uploadError instanceof ApiError ? uploadError.messageAr : 'Could not upload the image.',
      );
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    setError(null);
    try {
      await remove.mutateAsync();
    } catch (removeError) {
      setError(
        removeError instanceof ApiError ? removeError.messageAr : 'Could not remove the image.',
      );
    }
  };

  return (
    <SettingsSection
      title="Account photo"
      description={`The image is compressed for faster loading, with a maximum of ${MAX_AVATAR_BYTES / (1024 * 1024)} MB after compression.`}
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-subtle text-3xl font-bold text-brand ring-4 ring-surface-sunken">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={`Image ${profile.fullName}`}
              fill
              priority
              sizes="112px"
              unoptimized
              className="object-cover"
            />
          ) : (
            profile.fullName.trim().charAt(0) || <Camera className="size-8" aria-hidden />
          )}
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
          <p className="text-sm text-ink-muted">Shown in the account menu and sidebar.</p>
          <input
            ref={inputRef}
            type="file"
            aria-label="Choose account photo"
            accept={AVATAR_MIME_TYPES.join(',')}
            className="sr-only"
            onChange={(event) => void pick(event.target.files?.[0])}
          />
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" aria-hidden />
              {profile.avatarUrl ? 'Replace photo' : 'Upload photo'}
            </Button>
            {profile.avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger"
                loading={remove.isPending}
                onClick={() => void removePhoto()}
              >
                <Trash2 className="size-4" aria-hidden />
                Remove
              </Button>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </SettingsSection>
  );
}

function ProfileForm({ profile }: { profile: AccountProfile }) {
  const update = useUpdateAccountProfile();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AccountProfileInput>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: {
      fullName: profile.fullName,
      phone: profile.phone ?? undefined,
      version: profile.version,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false);
    setFormError(null);
    try {
      const updated = await update.mutateAsync(values);
      reset({
        fullName: updated.fullName,
        phone: updated.phone ?? undefined,
        version: updated.version,
      });
      setSaved(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.messageAr : 'Could not save account details.');
    }
  });

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  return (
    <form method="post" onSubmit={onSubmit}>
      <SettingsSection title="Personal details">
        <Field label="Full name" required error={errors.fullName?.message}>
          {(props) => <Input {...props} {...register('fullName')} autoComplete="name" />}
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

        <Field label="Email" hint="The sign-in email is managed in Users.">
          {(props) => (
            <Input
              {...props}
              value={profile.email}
              type="email"
              dir="ltr"
              className="text-start"
              disabled
            />
          )}
        </Field>

        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Save details
          </Button>
          {saved ? <span className="text-sm text-success">Saved.</span> : null}
        </div>
      </SettingsSection>
    </form>
  );
}

function AccountLinks() {
  return (
    <Card>
      <Link
        href="/more/security"
        className="flex items-center gap-3 border-b border-line p-3.5 transition-colors hover:bg-surface-sunken"
      >
        <KeyRound className="size-5 text-ink-subtle" aria-hidden />
        <span className="flex-1 text-sm text-ink">Password and sessions</span>
      </Link>
      <Link
        href="/more/notifications"
        className="flex items-center gap-3 p-3.5 transition-colors hover:bg-surface-sunken"
      >
        <Bell className="size-5 text-ink-subtle" aria-hidden />
        <span className="flex-1 text-sm text-ink">Notification settings</span>
      </Link>
    </Card>
  );
}
