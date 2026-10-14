'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  Skeleton,
} from '@muhami/ui';
import { SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import {
  changeEmployeeMailboxPassword,
  createEmployeeMailbox,
  mailboxKeys,
  useMailboxes,
  type EmployeeMailbox,
  type MailboxesOverview,
} from '@/lib/api/mailboxes';
import { useAuth } from '@/lib/auth-context';
import { useOnline } from '@/lib/offline';

const DOMAIN = 'preview.example';
type MailboxDialog = { mode: 'create' } | { mode: 'password'; mailbox: EmployeeMailbox };

export default function EmployeeMailboxesPage() {
  const { user, can } = useAuth();
  const canManage = user?.roleKey === 'OWNER' && can('settings:update');

  return (
    <SettingsShell
      title="Employee email"
      subtitle="Create an employee email address and set its password in one place."
      permission="settings:update"
    >
      {canManage ? (
        <MailboxesWorkspace key={`${user.officeId}:${user.id}`} />
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={ShieldCheck}
            title="Mail administration is for the office owner"
            description="Only the office owner can create employee mailboxes and change their passwords."
          />
        </Card>
      )}
    </SettingsShell>
  );
}

function MailboxesWorkspace() {
  const query = useMailboxes(true);
  const queryClient = useQueryClient();
  const online = useOnline();
  const [dialog, setDialog] = useState<MailboxDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedEmail) return;
    const timer = setTimeout(() => setCopiedEmail(null), 2500);
    return () => clearTimeout(timer);
  }, [copiedEmail]);

  const copyEmail = async (email: string) => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
    } catch {
      setCopyError('Could not copy. Select the email address and copy it directly.');
    }
  };

  const saved = (mailbox: EmployeeMailbox, mode: MailboxDialog['mode']) => {
    setBusy(false);
    setDialog(null);
    setNotice(
      mode === 'create'
        ? `Mailbox created: ${mailbox.email}. It may take a moment to become available.`
        : `Password changed for ${mailbox.email}. Use the new password to sign in to mail.`,
    );
    queryClient.setQueryData<MailboxesOverview>(mailboxKeys.all, (current) => {
      if (!current) return current;
      const exists = current.mailboxes.some((item) => item.email === mailbox.email);
      return {
        ...current,
        mailboxes: exists
          ? current.mailboxes.map((item) => (item.email === mailbox.email ? mailbox : item))
          : [...current.mailboxes, mailbox],
      };
    });
    void queryClient.invalidateQueries({ queryKey: mailboxKeys.all });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
              <Mail aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-ink">Company and employee email</h2>
              <p className="text-sm leading-6 text-ink-muted">
                Each employee has an independent mailbox on{' '}
                <bdi className="font-medium">{DOMAIN}</bdi> to send and receive messages and
                attachments.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="shrink-0"
            disabled
            title="Webmail is unavailable in this frontend preview."
          >
            <ExternalLink aria-hidden />
            Webmail unavailable in preview
          </Button>
        </div>
        <div className="border-t border-line bg-surface-sunken px-4 py-3 text-xs leading-6 text-ink-muted sm:px-5">
          Employees sign in with their full email address and the password you set. Mailbox access
          is separate from their system account.
        </div>
      </Card>

      {notice ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-success/20 bg-success-subtle p-3 text-sm leading-6 text-success"
        >
          <Check aria-hidden className="mt-1 size-4 shrink-0" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{notice}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Email addresses</h2>
        <Button
          size="sm"
          disabled={!online || !query.data || query.isError}
          onClick={() => {
            setNotice(null);
            setDialog({ mode: 'create' });
          }}
        >
          <Plus aria-hidden />
          Add email
        </Button>
      </div>

      {!online ? (
        <p role="status" className="text-sm text-warning">
          Connect to the internet to add mailboxes or change passwords.
        </p>
      ) : null}

      {query.isPending ? (
        <div className="space-y-3" aria-label="Loading email addresses">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Could not load mailboxes"
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.mailboxes.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {query.data.mailboxes.map((mailbox) => (
            <li key={mailbox.email}>
              <Card className="flex h-full flex-col gap-4 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
                    {mailbox.protected ? (
                      <ShieldCheck aria-hidden className="size-5" />
                    ) : (
                      <Mail aria-hidden className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-sm font-semibold text-ink">
                      {mailbox.name || mailbox.email}
                    </h3>
                    <p className="select-text text-sm text-ink-muted [overflow-wrap:anywhere]">
                      <bdi dir="ltr">{mailbox.email}</bdi>
                    </p>
                  </div>
                  {mailbox.protected ? <Badge>Company mailbox</Badge> : null}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Copy address ${mailbox.email}`}
                    onClick={() => void copyEmail(mailbox.email)}
                  >
                    {copiedEmail === mailbox.email ? <Check aria-hidden /> : <Copy aria-hidden />}
                    {copiedEmail === mailbox.email ? 'Copied' : 'Copy address'}
                  </Button>
                  {!mailbox.protected ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!online}
                      aria-label={`Change password ${mailbox.email}`}
                      onClick={() => {
                        setNotice(null);
                        setDialog({ mode: 'password', mailbox });
                      }}
                    >
                      <KeyRound aria-hidden />
                      Change password
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Mail}
          title="Add the first employee mailbox"
          description="Choose the employee's name, email address and password."
        />
      )}

      {copyError ? (
        <p role="alert" className="text-sm text-danger">
          {copyError}
        </p>
      ) : null}

      <Sheet
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        {dialog ? (
          <SheetContent
            title={dialog.mode === 'create' ? 'Add employee email' : 'Change mailbox password'}
            description={
              dialog.mode === 'create'
                ? 'Enter employee details and set a password to share with them privately.'
                : dialog.mailbox.email
            }
            onEscapeKeyDown={(event) => {
              if (busy) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (busy) event.preventDefault();
            }}
          >
            <MailboxForm
              dialog={dialog}
              onBusyChange={setBusy}
              onSaved={saved}
              onCancel={() => setDialog(null)}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}

function MailboxForm({
  dialog,
  onBusyChange,
  onSaved,
  onCancel,
}: {
  dialog: MailboxDialog;
  onBusyChange: (busy: boolean) => void;
  onSaved: (mailbox: EmployeeMailbox, mode: MailboxDialog['mode']) => void;
  onCancel: () => void;
}) {
  const online = useOnline();
  const [name, setName] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const validation: Record<string, string> = {};
    const address = localPart.trim().toLowerCase();
    if (dialog.mode === 'create') {
      if (!name.trim()) validation.name = 'Enter the employee name.';
      else if (name.trim().length > 100 || /\p{C}/u.test(name)) {
        validation.name = 'Enter a clear name of 100 characters or fewer.';
      }
      if (!/^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/.test(address) || address.includes('..')) {
        validation.localPart =
          'Use 3 to 64 English letters or numbers, without spaces. Example: ahmed';
      } else if (['info', 'postmaster', 'abuse'].includes(address)) {
        validation.localPart =
          'This address is reserved for the company. Choose another employee address.';
      }
    }
    if (password.length < 12 || password.length > 128 || !password.trim()) {
      validation.password = 'Use a password of 12 to 128 characters.';
    } else if (/\p{C}/u.test(password)) {
      validation.password =
        'The password contains unsupported characters. Use letters, numbers and standard symbols.';
    }
    if (password !== confirmation) validation.confirmation = 'Passwords do not match.';
    setErrors(validation);
    setError(null);
    if (Object.keys(validation).length) {
      const firstInvalidField = event.currentTarget.elements.namedItem(Object.keys(validation)[0]!);
      if (firstInvalidField instanceof HTMLInputElement) firstInvalidField.focus();
      return;
    }
    if (!online) {
      setError('Connect to the internet and try again.');
      return;
    }

    setPending(true);
    onBusyChange(true);
    try {
      const mailbox =
        dialog.mode === 'create'
          ? await createEmployeeMailbox({ name: name.trim(), localPart: address, password })
          : await changeEmployeeMailboxPassword(dialog.mailbox.email.split('@')[0]!, password);
      setPassword('');
      setConfirmation('');
      setShowPassword(false);
      onSaved(mailbox, dialog.mode);
    } catch (requestError) {
      setShowPassword(false);
      setError(
        requestError instanceof ApiError ? requestError.messageAr : 'Could not save. Try again.',
      );
      if (requestError instanceof ApiError) {
        setErrors(
          Object.fromEntries(
            Object.entries(requestError.fieldErrors).map(([field, messages]) => [
              field,
              messages[0] ?? '',
            ]),
          ),
        );
      }
    } finally {
      setPending(false);
      onBusyChange(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
      {dialog.mode === 'create' ? (
        <>
          <Field label="Employee name" required error={errors.name}>
            {(props) => (
              <Input
                {...props}
                name="name"
                autoComplete="off"
                value={name}
                maxLength={100}
                disabled={pending}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name displayed in the mailbox list"
              />
            )}
          </Field>
          <Field
            label="Email address"
            required
            error={errors.localPart}
            hint="Enter the address name in English. The company domain is added automatically."
          >
            {(props) => (
              <div
                dir="ltr"
                className="flex min-w-0 items-center rounded-md border border-line-strong bg-surface"
              >
                <Input
                  {...props}
                  name="localPart"
                  className="min-w-0 flex-1 border-0 bg-transparent"
                  dir="ltr"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={localPart}
                  maxLength={64}
                  disabled={pending}
                  onChange={(event) => setLocalPart(event.target.value.toLowerCase())}
                  placeholder="ahmed"
                />
                <span className="shrink-0 pe-3 text-sm text-ink-muted">@{DOMAIN}</span>
              </div>
            )}
          </Field>
        </>
      ) : null}

      <Field
        label={dialog.mode === 'create' ? 'Password' : 'New password'}
        required
        error={errors.password}
        hint="At least 12 characters. Combine words, numbers and symbols."
      >
        {(props) => (
          <div className="relative">
            <Input
              {...props}
              name="password"
              className="pe-12"
              dir="ltr"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              maxLength={128}
              disabled={pending}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="tap-target absolute end-0 top-0 flex items-center justify-center rounded-md text-ink-subtle hover:text-ink"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? (
                <EyeOff aria-hidden className="size-4" />
              ) : (
                <Eye aria-hidden className="size-4" />
              )}
            </button>
          </div>
        )}
      </Field>
      <Field label="Confirm password" required error={errors.confirmation}>
        {(props) => (
          <Input
            {...props}
            name="confirmation"
            dir="ltr"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmation}
            maxLength={128}
            disabled={pending}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        )}
      </Field>
      {error ? (
        <p role="alert" className="text-sm leading-6 text-danger">
          {error}
        </p>
      ) : null}
      <SheetFooter>
        <Button type="submit" className="flex-1" loading={pending} disabled={!online}>
          {dialog.mode === 'create' ? 'Create mailbox' : 'Save Password'}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
