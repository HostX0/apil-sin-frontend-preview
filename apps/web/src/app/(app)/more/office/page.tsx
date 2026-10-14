'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  BRANDING_ASSETS,
  BRANDING_ASSET_AR,
  BRANDING_ASSET_HINT_AR,
  BRANDING_MIME_TYPES,
  MAX_BRANDING_BYTES,
  officeProfileSchema,
  type BrandingAsset,
  type OfficeProfile,
  type OfficeProfileInput,
} from '@/lib/ui-shared';
import { Button, Card, ErrorState, Field, Input, Skeleton, Textarea } from '@muhami/ui';
import { BrandLogo } from '@/components/brand/brand-logo';
import { SettingsSection, SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import {
  useOfficeProfile,
  useRemoveBranding,
  useUpdateOfficeProfile,
  useUploadBranding,
} from '@/lib/api/office';
import { useAuth } from '@/lib/auth-context';

/**
 * مكتبي — the office's own record.
 *
 * Everything on this screen ends up printed on a document a court will read, so
 * the preview is not decoration: it is the only place a lawyer can see what
 * their letterhead actually looks like before a receipt goes out.
 */
export default function OfficePage() {
  const query = useOfficeProfile();

  return (
    <SettingsShell
      title="Office details"
      subtitle="These details appear on printed document headers."
      permission="office:read"
    >
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : query.data ? (
        <OfficeForms profile={query.data} />
      ) : null}
    </SettingsShell>
  );
}

function OfficeForms({ profile }: { profile: OfficeProfile }) {
  const { can } = useAuth();
  const canEdit = can('office:update');

  return (
    <div className="space-y-5">
      <ProfileForm profile={profile} disabled={!canEdit} />
      <BrandingSection profile={profile} disabled={!can('office.branding:update')} />
      <LetterheadPreview profile={profile} />
    </div>
  );
}

function ProfileForm({ profile, disabled }: { profile: OfficeProfile; disabled: boolean }) {
  const mutation = useUpdateOfficeProfile();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OfficeProfileInput>({
    resolver: zodResolver(officeProfileSchema),
    defaultValues: {
      name: profile.name,
      lawyerName: profile.lawyerName ?? undefined,
      address: profile.address ?? undefined,
      phonePrimary: profile.phonePrimary ?? undefined,
      phoneSecondary: profile.phoneSecondary ?? undefined,
      email: profile.email ?? undefined,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await mutation.mutateAsync(values);
      reset({
        name: updated.name,
        lawyerName: updated.lawyerName ?? undefined,
        address: updated.address ?? undefined,
        phonePrimary: updated.phonePrimary ?? undefined,
        phoneSecondary: updated.phoneSecondary ?? undefined,
        email: updated.email ?? undefined,
      });
      setSaved(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.messageAr : 'Could not save.');
    }
  });

  // The confirmation clears itself; a permanent "تم الحفظ" stops meaning anything.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  return (
    <form method="post" onSubmit={onSubmit}>
      <SettingsSection title="Identity">
        <Field label="Office name" required error={errors.name?.message}>
          {(props) => <Input {...props} {...register('name')} disabled={disabled} />}
        </Field>

        <Field
          label="Lawyer name"
          error={errors.lawyerName?.message}
          hint="Shown below the office name in the document header."
        >
          {(props) => <Input {...props} {...register('lawyerName')} disabled={disabled} />}
        </Field>

        <Field label="Address" error={errors.address?.message}>
          {(props) => <Textarea {...props} {...register('address')} rows={2} disabled={disabled} />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary phone" error={errors.phonePrimary?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('phonePrimary')}
                inputMode="tel"
                dir="ltr"
                className="text-start"
                placeholder="07XXXXXXXXX"
                disabled={disabled}
              />
            )}
          </Field>

          <Field label="Additional phone" error={errors.phoneSecondary?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('phoneSecondary')}
                inputMode="tel"
                dir="ltr"
                className="text-start"
                placeholder="07XXXXXXXXX"
                disabled={disabled}
              />
            )}
          </Field>
        </div>

        <Field label="Email" error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('email')}
              type="email"
              dir="ltr"
              className="text-start"
              disabled={disabled}
            />
          )}
        </Field>

        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}

        {!disabled ? (
          <div className="flex items-center gap-3">
            <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
              Save
            </Button>
            {saved ? <span className="text-sm text-success">Saved.</span> : null}
          </div>
        ) : null}
      </SettingsSection>
    </form>
  );
}

function BrandingSection({ profile, disabled }: { profile: OfficeProfile; disabled: boolean }) {
  const urls: Record<BrandingAsset, string | null> = {
    logo: profile.logoUrl,
    stamp: profile.stampUrl,
    signature: profile.signatureUrl,
  };

  return (
    <SettingsSection
      title="Logo, stamp and signature"
      description={`PNG, JPEG or WebP images, with a maximum size of ${Math.round(MAX_BRANDING_BYTES / 1024)} KB.`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {BRANDING_ASSETS.map((asset) => (
          <BrandingSlot key={asset} asset={asset} url={urls[asset]} disabled={disabled} />
        ))}
      </div>
    </SettingsSection>
  );
}

function BrandingSlot({
  asset,
  url,
  disabled,
}: {
  asset: BrandingAsset;
  url: string | null;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadBranding();
  const remove = useRemoveBranding();
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    // Checked here as well as server-side so the user learns before spending
    // their upload allowance on a file that will be refused.
    if (file.size > MAX_BRANDING_BYTES) {
      setError(`The file is larger than ${Math.round(MAX_BRANDING_BYTES / 1024)} KB.`);
      return;
    }
    if (!BRANDING_MIME_TYPES.includes(file.type as (typeof BRANDING_MIME_TYPES)[number])) {
      setError('Unsupported format.');
      return;
    }

    try {
      await upload.mutateAsync({ asset, file });
    } catch (uploadError) {
      setError(
        uploadError instanceof ApiError ? uploadError.messageAr : 'Could not upload the image.',
      );
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{BRANDING_ASSET_AR[asset]}</p>

      <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-line-strong bg-surface-sunken p-2">
        {url ? (
          // A remote presigned URL: unoptimised, because Next cannot cache a URL
          // that expires in minutes and re-fetching it through the optimiser
          // would just add a second signature to verify.
          <Image
            src={url}
            alt={BRANDING_ASSET_AR[asset]}
            width={160}
            height={96}
            unoptimized
            className="max-h-24 w-auto object-contain"
          />
        ) : (
          <span className="text-xs text-ink-subtle">No image</span>
        )}
      </div>

      <p className="text-xs text-ink-subtle">{BRANDING_ASSET_HINT_AR[asset]}</p>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}

      {!disabled ? (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            aria-label={`Upload ${BRANDING_ASSET_AR[asset]}`}
            accept={BRANDING_MIME_TYPES.join(',')}
            className="sr-only"
            onChange={(event) => void pick(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            {url ? 'Replace' : 'Upload'}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={remove.isPending}
              onClick={() => remove.mutate(asset)}
              aria-label={`Remove ${BRANDING_ASSET_AR[asset]}`}
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * What the letterhead will look like.
 *
 * Deliberately a plain HTML approximation rather than a real PDF render: it
 * costs nothing, updates instantly as fields change, and answers the question
 * being asked ("is my address right, is the logo the right shape"). The
 * authoritative output is still the PDF, and Phase 11's smoke test is what
 * proves that one.
 */
function LetterheadPreview({ profile }: { profile: OfficeProfile }) {
  return (
    <SettingsSection title="Letterhead preview">
      <Card className="border border-line bg-white p-5 text-ink" data-theme="light">
        <div className="flex items-start gap-4 border-b border-line pb-3">
          {profile.logoUrl ? (
            <Image
              src={profile.logoUrl}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="size-16 object-contain"
            />
          ) : (
            <BrandLogo size={64} decorative />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{profile.name}</p>
            {profile.lawyerName ? (
              <p className="text-sm text-ink-muted">{profile.lawyerName}</p>
            ) : null}
            {profile.address ? (
              <p className="mt-1 text-xs text-ink-subtle">{profile.address}</p>
            ) : null}
            <p className="mt-1 text-xs text-ink-subtle">
              {/* Isolated so a leading "+" cannot be reordered by the bidi
                  algorithm — the exact defect Phase 11 found in the PDF. */}
              {[profile.phonePrimary, profile.phoneSecondary, profile.email]
                .filter(Boolean)
                .map((value) => `⁦${value}⁩`)
                .join(' · ')}
            </p>
          </div>
        </div>
        <p className="pt-4 text-center text-xs text-ink-subtle">
          Document text appears here - receipts, letters and reports
        </p>
      </Card>
    </SettingsSection>
  );
}
