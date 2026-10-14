'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  createLawyerSchema,
  type CreateLawyerInput,
  type LawyerDetail,
  type LawyerSummary,
} from '@muhami/shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea } from '@muhami/ui';
import { api, ApiError } from '@/lib/api-client';
import {
  useLawyer,
  useCreateLawyer,
  useUpdateLawyer,
  uploadLawyerAsset,
  downloadLawyerAsset,
  lawyerKeys,
} from '@/lib/api/lawyers';
import { UploadError } from '@/lib/upload';
import { useUsers } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth-context';

export function LawyerFormSheet({
  profile,
  onClose,
  onSaved,
}: {
  profile?: LawyerSummary;
  onClose: () => void;
  onSaved?: (profile: LawyerDetail) => void;
}) {
  const detail = useLawyer(profile?.id ?? '', Boolean(profile));
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent title={profile ? 'Edit lawyer profile' : 'Add an office lawyer'}>
        {profile && detail.isLoading ? (
          <p className="text-sm text-ink-muted">Loading file…</p>
        ) : profile && detail.isError ? (
          <p role="alert" className="text-sm text-danger">
            Could not load the file.{' '}
            <button type="button" className="underline" onClick={() => void detail.refetch()}>
              Try again
            </button>
          </p>
        ) : (
          <ProfileForm profile={detail.data} onClose={onClose} onSaved={onSaved} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ProfileForm({
  profile,
  onClose,
  onSaved,
}: {
  profile?: LawyerDetail;
  onClose: () => void;
  onSaved?: (profile: LawyerDetail) => void;
}) {
  const { can } = useAuth();
  const users = useUsers({ status: 'ACTIVE' }, can('user:read'));
  const accountOptions =
    users.data?.pages
      .flatMap((page) => page.items)
      .filter((user) => user.roleKey === 'OWNER' || user.roleKey === 'LAWYER') ?? [];
  const create = useCreateLawyer();
  const update = useUpdateLawyer(profile?.id ?? '');
  const cache = useQueryClient();
  const [saved, setSaved] = useState(profile);
  const [active, setActive] = useState(profile?.isActive ?? true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [identity, setIdentity] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [savedThisAttempt, setSavedThisAttempt] = useState(false);
  const [showMore, setShowMore] = useState(Boolean(profile));
  const form = useForm<CreateLawyerInput>({
    resolver: zodResolver(createLawyerSchema),
    defaultValues: {
      fullName: profile?.fullName ?? '',
      phone: profile?.phone ?? '',
      email: profile?.email ?? '',
      joinedAt: profile?.joinedAt?.slice(0, 10) ?? '',
      membershipNumber: profile?.membershipNumber ?? '',
      notes: profile?.notes ?? '',
      userId: profile?.userId ?? undefined,
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const userId = form.watch('userId');
  const submit = handleSubmit(
    async (input) => {
      setError(null);
      setSavedThisAttempt(false);
      setStage('Saving lawyer profile…');
      let current: LawyerDetail;
      try {
        const target = saved ?? profile;
        current = target ? await apiUpdate(target, input, active) : await create.mutateAsync(input);
        setSaved(current);
        setSavedThisAttempt(true);
        if (photo) {
          setStage('Uploading lawyer photo…');
          current = await uploadLawyerAsset(current.id, 'photo', photo, current.version);
          setSaved(current);
          setPhoto(null);
        }
        if (identity) {
          setStage('Uploading ID copy…');
          current = await uploadLawyerAsset(current.id, 'identity', identity, current.version);
          setSaved(current);
          setIdentity(null);
        }
        cache.setQueryData(lawyerKeys.detail(current.id), current);
        void cache.invalidateQueries({ queryKey: lawyerKeys.all });
        onSaved?.(current);
        onClose();
      } catch (failure) {
        if (failure instanceof ApiError) {
          for (const [field, messages] of Object.entries(failure.fieldErrors))
            form.setError(field as keyof CreateLawyerInput, { message: messages[0] });
          if (
            Object.keys(failure.fieldErrors).some((field) => !['fullName', 'phone'].includes(field))
          )
            setShowMore(true);
          setError(failure.messageAr);
        } else
          setError(
            failure instanceof UploadError ? failure.messageAr : 'Could not save. Try again.',
          );
        void cache.invalidateQueries({ queryKey: lawyerKeys.all });
      } finally {
        setStage(null);
      }
    },
    (invalid) => {
      if (
        invalid.email ||
        invalid.joinedAt ||
        invalid.membershipNumber ||
        invalid.notes ||
        invalid.userId
      )
        setShowMore(true);
    },
  );
  // A newly-created standalone profile keeps its id after a file failure so a
  // retry edits that same row instead of creating a duplicate lawyer.
  async function apiUpdate(target: LawyerDetail, input: CreateLawyerInput, isActive: boolean) {
    if (target.id === profile?.id)
      return update.mutateAsync({ ...input, version: target.version, isActive });
    return api.patch<LawyerDetail>(`/lawyers/${target.id}`, {
      ...input,
      version: target.version,
      isActive,
    });
  }
  const download = async (kind: 'photo' | 'identity') => {
    const target = saved ?? profile;
    if (!target) return;
    const preview = window.open('about:blank', '_blank');
    if (!preview) {
      setError('The attachment window did not open. Allow pop-ups for this site, then try again.');
      return;
    }
    preview.opener = null;
    try {
      const ticket = await downloadLawyerAsset(target.id, kind);
      preview.location.replace(ticket.url);
    } catch (failure) {
      preview.close();
      setError(failure instanceof ApiError ? failure.messageAr : 'Could not open the attachment.');
    }
  };
  const pickAsset = (kind: 'photo' | 'identity', file: File | undefined) => {
    setError(null);
    if (!file) {
      if (kind === 'photo') setPhoto(null);
      else setIdentity(null);
      return true;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (kind === 'identity') allowed.push('application/pdf');
    const maximum = (kind === 'photo' ? 5 : 10) * 1024 * 1024;
    if (!allowed.includes(file.type) || file.size === 0 || file.size > maximum) {
      if (kind === 'photo') setPhoto(null);
      else setIdentity(null);
      setError(
        kind === 'photo'
          ? 'Choose a JPEG, PNG or WebP image up to 5 MB.'
          : 'Choose a PDF or image copy of the ID up to 10 MB.',
      );
      return false;
    }
    if (kind === 'photo') setPhoto(file);
    else setIdentity(file);
    return true;
  };

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <p className="text-sm text-ink-muted">
          Enter the lawyer’s name and mobile number for assignments and contact. Add a photo, ID and
          other details later.
        </p>
        <Field label="Lawyer name" required error={errors.fullName?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('fullName')}
              autoComplete="name"
              autoFocus
              placeholder="Lawyer’s full name"
            />
          )}
        </Field>
        <Field
          label="Mobile number (optional)"
          error={errors.phone?.message}
          hint="Add it to send messages and tasks via WhatsApp, for example 07701234567."
        >
          {(props) => (
            <Input
              {...props}
              {...register('phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="07XXXXXXXXX"
            />
          )}
        </Field>
        <button
          type="button"
          onClick={() => setShowMore((current) => !current)}
          aria-expanded={showMore}
          className="flex min-h-11 w-full items-center gap-2 text-sm font-medium text-brand"
        >
          <ChevronDown aria-hidden className={showMore ? 'size-4 rotate-180' : 'size-4'} />
          Lawyer details and files (optional)
        </button>
        {showMore ? (
          <div className="space-y-4 border-t border-line pt-4">
            <Field label="Membership / joining date" error={errors.joinedAt?.message}>
              {(props) => <Input {...props} {...register('joinedAt')} type="date" />}
            </Field>
            <Field label="Membership number (optional)" error={errors.membershipNumber?.message}>
              {(props) => <Input {...props} {...register('membershipNumber')} />}
            </Field>
            <Field label="Email (optional)" error={errors.email?.message}>
              {(props) => <Input {...props} {...register('email')} type="email" dir="ltr" />}
            </Field>
            <Field label="Office notes" error={errors.notes?.message}>
              {(props) => <Textarea {...props} {...register('notes')} rows={2} />}
            </Field>
            <label htmlFor="lawyer-photo-file" className="block space-y-2 text-sm text-ink">
              <span>Lawyer photo</span>
              <Input
                id="lawyer-photo-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  if (!pickAsset('photo', event.target.files?.[0])) event.target.value = '';
                }}
              />
              <span className="block text-xs text-ink-subtle">JPEG, PNG or WebP, up to 5 MB.</span>
            </label>
            {(saved ?? profile)?.photo ? (
              <button
                type="button"
                className="min-h-11 text-sm text-brand underline"
                onClick={() => void download('photo')}
              >
                View current photo
              </button>
            ) : null}
            <label htmlFor="lawyer-identity-file" className="block space-y-2 text-sm text-ink">
              <span>ID copy</span>
              <Input
                id="lawyer-identity-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  if (!pickAsset('identity', event.target.files?.[0])) event.target.value = '';
                }}
              />
              <span className="block text-xs text-ink-subtle">
                PDF or image, up to 10 MB. Available to the office administrator only.
              </span>
            </label>
            {(saved ?? profile)?.identity ? (
              <button
                type="button"
                className="min-h-11 text-sm text-brand underline"
                onClick={() => void download('identity')}
              >
                Download current ID copy
              </button>
            ) : null}
            {profile ? (
              <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  className="size-4 accent-brand"
                />
                Lawyer is active and available for assignments
              </label>
            ) : null}
            {can('user:read') ? (
              <Field
                label="Lawyer’s app account (optional)"
                error={errors.userId?.message}
                hint="Choose their account if they will sign in to follow their cases."
              >
                {(props) => (
                  <div className="space-y-2">
                    <select
                      {...props}
                      disabled={users.isLoading || users.isError}
                      value={userId ?? ''}
                      onChange={(event) => form.setValue('userId', event.target.value || null)}
                      className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
                    >
                      <option value="">
                        {users.isLoading ? 'Loading accounts…' : 'No sign-in account'}
                      </option>
                      {userId && !accountOptions.some((account) => account.id === userId) ? (
                        <option value={userId}>Currently linked sign-in account</option>
                      ) : null}
                      {accountOptions.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.fullName} — {account.email}
                        </option>
                      ))}
                    </select>
                    {users.isError ? (
                      <p role="alert" className="text-sm text-danger">
                        Could not load accounts.{' '}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => void users.refetch()}
                        >
                          Try again
                        </button>
                      </p>
                    ) : null}
                    {users.hasNextPage ? (
                      <button
                        type="button"
                        className="text-xs text-brand underline"
                        onClick={() => void users.fetchNextPage()}
                      >
                        Load more accounts
                      </button>
                    ) : null}
                  </div>
                )}
              </Field>
            ) : null}
            {can('user:read') ? (
              <p className="text-xs text-ink-subtle">
                If they do not have an account, add one in Office accounts, then link it here.
              </p>
            ) : null}
          </div>
        ) : null}
        {savedThisAttempt && error ? (
          <p className="rounded-md bg-info-subtle p-3 text-sm text-info">
            Lawyer details saved. The attachment upload could not finish. Try again to complete it
            without adding another lawyer.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        {stage ? (
          <p role="status" className="text-sm text-ink-muted">
            {stage}
          </p>
        ) : null}
        <SheetFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" block loading={isSubmitting}>
            {profile || saved ? 'Save changes' : 'Add lawyer'}
          </Button>
        </SheetFooter>
      </fieldset>
    </form>
  );
}
