'use client';

import { uiEnglish } from '@/lib/ui-english';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  inviteUserSchema,
  updateUserSchema,
  type InviteUserInput,
  type RoleSummary,
  type UpdateUserInput,
  type UserSummary,
} from '@muhami/shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useInviteUser, useUpdateUser } from '@/lib/api/admin';

/**
 * Add / edit a user.
 *
 * The add flow ends on a screen the owner must read, not a toast: it carries the
 * temporary password, which exists exactly once and cannot be retrieved
 * afterwards. Closing the sheet before copying it means resetting the password.
 * That is stated plainly rather than being a surprise.
 */
export function UserFormSheet({
  open,
  onOpenChange,
  user,
  roles,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  user?: UserSummary;
  roles: RoleSummary[];
  title?: string;
}) {
  const isEdit = Boolean(user);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={title ?? (isEdit ? 'Edit user' : 'Add user')}>
        {isEdit && user ? (
          <EditForm user={user} roles={roles} onDone={() => onOpenChange(false)} />
        ) : (
          <InviteForm roles={roles} onClose={() => onOpenChange(false)} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function InviteForm({ roles, onClose }: { roles: RoleSummary[]; onClose: () => void }) {
  const mutation = useInviteUser();
  const [result, setResult] = useState<{
    name: string;
    password: string;
    emailSent: boolean;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    // A role must be chosen; defaulting to the least-privileged one would be a
    // guess, and defaulting to the first row would silently hand out whatever
    // sorts first.
    defaultValues: { fullName: '', email: '', roleId: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const invited = await mutation.mutateAsync(values);
      setResult({
        name: invited.user.fullName,
        password: invited.temporaryPassword,
        emailSent: invited.emailSent,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          setError(field as keyof InviteUserInput, { message: messages[0] });
        }
        setFormError(Object.keys(error.fieldErrors).length > 0 ? null : error.messageAr);
      } else {
        setFormError('Could not add the user.');
      }
    }
  });

  if (result) return <TemporaryPassword {...result} onClose={onClose} />;

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <Field label="Full name" required error={errors.fullName?.message}>
        {(props) => <Input {...props} {...register('fullName')} autoFocus />}
      </Field>

      <Field label="Email" required error={errors.email?.message} hint="Used to sign in.">
        {(props) => (
          <Input {...props} {...register('email')} type="email" dir="ltr" className="text-start" />
        )}
      </Field>

      <Field label="Mobile number" error={errors.phone?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('phone')}
            inputMode="tel"
            dir="ltr"
            className="text-start"
            placeholder="07XXXXXXXXX"
          />
        )}
      </Field>

      <Field label="Role" required error={errors.roleId?.message}>
        {(props) => (
          <select
            {...props}
            {...register('roleId')}
            className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
          >
            <option value="">Choose a role…</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {uiEnglish(role.nameAr, role.nameAr)}
              </option>
            ))}
          </select>
        )}
      </Field>

      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <SheetFooter>
        <Button type="submit" block loading={isSubmitting || mutation.isPending}>
          Add user
        </Button>
      </SheetFooter>
    </form>
  );
}

function EditForm({
  user,
  roles,
  onDone,
}: {
  user: UserSummary;
  roles: RoleSummary[];
  onDone: () => void;
}) {
  const mutation = useUpdateUser();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone ?? undefined,
      roleId: user.roleId,
      version: user.version,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync({ id: user.id, ...values });
      onDone();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.messageAr : 'Could not save.');
    }
  });

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <Field label="Full name" required error={errors.fullName?.message}>
        {(props) => <Input {...props} {...register('fullName')} />}
      </Field>

      <Field label="Email" hint="The email cannot be changed after creation.">
        {(props) => (
          <Input {...props} value={user.email} dir="ltr" className="text-start" disabled />
        )}
      </Field>

      <Field label="Mobile number" error={errors.phone?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('phone')}
            inputMode="tel"
            dir="ltr"
            className="text-start"
          />
        )}
      </Field>

      <Field label="Role" required error={errors.roleId?.message}>
        {(props) => (
          <select
            {...props}
            {...register('roleId')}
            className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {uiEnglish(role.nameAr, role.nameAr)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <input type="hidden" {...register('version')} />

      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <SheetFooter>
        <Button type="submit" block loading={isSubmitting || mutation.isPending}>
          Save
        </Button>
      </SheetFooter>
    </form>
  );
}

/** Shown once. Copy button included because the string is deliberately unmemorable. */
export function TemporaryPassword({
  name,
  password,
  emailSent,
  onClose,
}: {
  name: string;
  password: string;
  emailSent: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied (insecure origin, or the user said no). The password is
      // on screen and selectable, so this is a missing convenience, not a failure.
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md bg-success-subtle p-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-ink">Added {name}.</p>
          <p className="text-xs text-ink-muted">
            {emailSent
              ? 'A welcome email was sent without the password.'
              : 'No email was sent. Share the password directly.'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">Temporary password</p>
        <div className="flex items-center gap-2">
          <code
            dir="ltr"
            className="flex-1 select-all rounded-md border border-line-strong bg-surface-sunken px-3 py-2.5 text-center font-mono text-lg tracking-widest text-ink"
          >
            {password}
          </code>
          <Button type="button" variant="secondary" onClick={() => void copy()}>
            <Copy className="size-4" />
            {copied ? 'Copied' : 'versions'}
          </Button>
        </div>
        <p className="text-xs text-warning">
          This password is shown only once. If you close this window before copying it, you must
          reset it. The user will be asked to change it at first sign-in.
        </p>
      </div>

      <SheetFooter>
        <Button type="button" block onClick={onClose}>
          Done
        </Button>
      </SheetFooter>
    </div>
  );
}
