'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CLIENT_KINDS,
  CLIENT_KIND_AR,
  createClientSchema,
  formatIraqiMobile,
  type ClientDetail,
  type CreateClientInput,
  type UpdateClientInput,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea, cn } from '@muhami/ui';
import { useCreateClient, useDuplicateCheck, useUpdateClient } from '@/lib/api/clients';
import { useWhatsAppAutomations } from '@/lib/api/whatsapp';
import { ApiError } from '@/lib/api-client';
import { useDebounced } from '@/lib/use-debounced';
import { useAuth } from '@/lib/auth-context';
import { automaticMessagePreview } from '@/lib/whatsapp-template-preview';

/** Only the name and mobile are needed to open a client's file. */
export function ClientFormSheet({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  client?: ClientDetail;
  onSaved?: (client: ClientDetail) => void;
}) {
  const isEdit = Boolean(client);
  const { can, user } = useAuth();
  const canSendWelcome = can('whatsapp:send');
  const automations = useWhatsAppAutomations(open && !isEdit && can('whatsapp:read'));
  const welcomeTemplate = automations.data?.find(
    (template) => template.eventKey === 'client.created',
  );
  const [showMore, setShowMore] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient(client?.id ?? '');

  const form = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      fullName: client?.fullName ?? '',
      mobile: client?.mobile ?? '',
      kind: client?.kind ?? 'INDIVIDUAL',
      nationalId: client?.nationalId ?? undefined,
      address: client?.address ?? undefined,
      phoneSecondary: client?.phoneSecondary ?? undefined,
      email: client?.email ?? undefined,
      notes: client?.notes ?? undefined,
      sendWelcome: !isEdit && canSendWelcome,
      includeWelcomeImage: true,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const mobile = watch('mobile') ?? '';
  const fullName = watch('fullName') ?? '';
  const nationalId = watch('nationalId') ?? '';
  const kind = watch('kind');
  const sendWelcome = watch('sendWelcome');

  const debouncedMobile = useDebounced(mobile, 400);
  const debouncedNationalId = useDebounced(nationalId, 400);

  const { data: duplicates } = useDuplicateCheck({
    mobile: debouncedMobile,
    nationalId: debouncedNationalId,
    excludeId: client?.id,
    enabled: open,
  });

  const hasDuplicates = (duplicates?.length ?? 0) > 0;

  useEffect(() => {
    if (!open) {
      reset();
      setShowMore(false);
      setFormError(null);
      setDuplicateAccepted(false);
    }
  }, [open, reset]);

  // A changed number is a different potential duplicate; the previous consent
  // no longer applies.
  useEffect(() => {
    setDuplicateAccepted(false);
  }, [debouncedMobile, debouncedNationalId]);

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        const payload = {
          ...values,
          sendWelcome:
            !isEdit && canSendWelcome
              ? welcomeTemplate?.enabled !== false && values.sendWelcome === true
              : undefined,
          includeWelcomeImage:
            !isEdit && canSendWelcome ? values.includeWelcomeImage !== false : undefined,
          confirmDuplicate: duplicateAccepted,
        };
        const saved = isEdit
          ? await updateMutation.mutateAsync({
              ...payload,
              version: client!.version,
            } as UpdateClientInput)
          : await createMutation.mutateAsync(payload);

        onSaved?.(saved);
        onOpenChange(false);
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === 'DUPLICATE') {
            setFormError(error.messageAr);
            setDuplicateAccepted(false);
          } else if (error.code === 'VERSION_CONFLICT') {
            setFormError(error.messageAr);
          } else {
            for (const [field, messages] of Object.entries(error.fieldErrors)) {
              form.setError(field as keyof CreateClientInput, { message: messages[0] });
            }
            if (
              ['nationalId', 'address', 'phoneSecondary', 'email', 'notes'].some(
                (field) => error.fieldErrors[field],
              )
            )
              setShowMore(true);
            if (Object.keys(error.fieldErrors).length === 0) setFormError(error.messageAr);
          }
        } else {
          setFormError('Could not save. Please try again.');
        }
      }
    },
    (invalid) => {
      if (
        invalid.nationalId ||
        invalid.address ||
        invalid.phoneSecondary ||
        invalid.email ||
        invalid.notes
      )
        setShowMore(true);
    },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={isEdit ? 'Edit client details' : 'New client'}
        description={isEdit ? undefined : 'A name and mobile number are enough to get started.'}
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <fieldset disabled={isSubmitting} className="space-y-4">
            <Field label="Full name" required error={errors.fullName?.message}>
              {(props) => (
                <Input
                  {...props}
                  {...register('fullName')}
                  autoComplete="name"
                  placeholder="Example: Ahmed Karim"
                  autoFocus
                />
              )}
            </Field>

            <Field
              label="Mobile number"
              required
              error={errors.mobile?.message}
              hint="Iraqi mobile number beginning with 07, for example 07701234567. Used for WhatsApp contact."
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('mobile')}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="07701234567"
                />
              )}
            </Field>

            {hasDuplicates ? (
              <DuplicateWarning
                matches={duplicates!}
                accepted={duplicateAccepted}
                onAccept={setDuplicateAccepted}
              />
            ) : null}

            {!isEdit && canSendWelcome && welcomeTemplate?.enabled !== false ? (
              <div className="space-y-2 rounded-xl border border-brand/20 bg-brand-subtle/40 p-3">
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    {...register('sendWelcome')}
                    className="size-4 accent-brand"
                  />
                  Send a welcome message on WhatsApp
                </label>
                {welcomeTemplate ? (
                  <p className="whitespace-pre-wrap break-words text-xs leading-7 text-ink-muted">
                    {automaticMessagePreview(welcomeTemplate.body, {
                      اسم_المستلم: fullName.trim() || 'Client',
                      اسم_الشركة: user?.officeName || 'DevsHub',
                    })}
                  </p>
                ) : (
                  <p className="text-xs leading-7 text-ink-muted">
                    {automations.isError || !can('whatsapp:read')
                      ? 'The saved welcome template will be used if enabled. You can uncheck it for this client.'
                      : 'Loading the saved welcome message…'}
                  </p>
                )}
                {(welcomeTemplate?.welcomeImageEnabled !== false &&
                  (welcomeTemplate?.welcomeImageId || welcomeTemplate?.welcomeUpload)) ||
                (!welcomeTemplate && (automations.isError || !can('whatsapp:read'))) ? (
                  <div className="space-y-1 border-t border-brand/15 pt-2">
                    <label
                      className={cn(
                        'flex min-h-11 items-center gap-2.5 text-sm font-medium',
                        sendWelcome ? 'cursor-pointer text-ink' : 'text-ink-subtle',
                      )}
                    >
                      <input
                        type="checkbox"
                        {...register('includeWelcomeImage')}
                        disabled={!sendWelcome}
                        className="size-4 shrink-0 accent-brand"
                      />
                      Attach the welcome image on WhatsApp
                    </label>
                    <p className="text-xs leading-6 text-ink-muted">
                      Unchecking sends the welcome text only for this client.
                    </p>
                  </div>
                ) : null}
                <p className="text-xs leading-6 text-ink-subtle">
                  Sent from the office number after saving. If disconnected, the message waits until
                  the number reconnects.
                </p>
              </div>
            ) : !isEdit && canSendWelcome && welcomeTemplate?.enabled === false ? (
              <p className="rounded-xl bg-surface-sunken p-3 text-xs leading-7 text-ink-muted">
                The automatic welcome message is currently disabled.
                {can('whatsapp:templates.manage')
                  ? ' Enable it in WhatsApp → Automatic messages.'
                  : ''}
              </p>
            ) : null}

            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-sm font-medium text-ink">Client type</legend>
              <div className="flex gap-2">
                {CLIENT_KINDS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setValue('kind', option, { shouldDirty: true })}
                    aria-pressed={kind === option}
                    className={cn(
                      'tap-target flex-1 rounded-md border px-3 text-sm font-medium transition-colors',
                      kind === option
                        ? 'border-brand bg-brand-subtle text-brand'
                        : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
                    )}
                  >
                    {CLIENT_KIND_AR[option]}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => setShowMore((value) => !value)}
              aria-expanded={showMore}
              className="flex w-full items-center gap-1.5 py-1 text-sm font-medium text-brand"
            >
              <ChevronDown
                className={cn('size-4 transition-transform', showMore && 'rotate-180')}
              />
              Additional details (optional)
            </button>

            {showMore ? (
              <div className="space-y-4 border-t border-line pt-4">
                <Field
                  label={kind === 'COMPANY' ? 'Registration number' : 'National ID number'}
                  error={errors.nationalId?.message}
                >
                  {(props) => (
                    <Input {...props} {...register('nationalId')} inputMode="numeric" dir="ltr" />
                  )}
                </Field>

                <Field label="Additional mobile number" error={errors.phoneSecondary?.message}>
                  {(props) => (
                    <Input {...props} {...register('phoneSecondary')} type="tel" dir="ltr" />
                  )}
                </Field>

                <Field label="Email" error={errors.email?.message}>
                  {(props) => <Input {...props} {...register('email')} type="email" dir="ltr" />}
                </Field>

                <Field label="Address" error={errors.address?.message}>
                  {(props) => <Input {...props} {...register('address')} />}
                </Field>

                <Field label="Notes" error={errors.notes?.message}>
                  {(props) => <Textarea {...props} {...register('notes')} rows={3} />}
                </Field>
              </div>
            ) : null}

            {formError ? (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}

            <SheetFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                block
                loading={isSubmitting}
                disabled={hasDuplicates && !duplicateAccepted}
              >
                {isEdit ? 'Save changes' : 'Add client'}
              </Button>
            </SheetFooter>
          </fieldset>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DuplicateWarning({
  matches,
  accepted,
  onAccept,
}: {
  matches: Array<{ id: string; fullName: string; mobile: string; matchedOn: string[] }>;
  accepted: boolean;
  onAccept: (accepted: boolean) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-warning/40 bg-warning-subtle p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-warning">
            A client with these details already exists
          </p>
          <ul className="space-y-1">
            {matches.map((match) => (
              <li key={match.id} className="text-sm text-ink-muted">
                <span className="font-medium text-ink">{match.fullName}</span>
                <span className="ltr-numerals mx-1.5 text-ink-subtle">
                  {formatIraqiMobile(match.mobile)}
                </span>
                <span className="text-xs text-ink-subtle">
                  ({match.matchedOn.includes('mobile') ? 'Mobile number' : 'ID number'})
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-muted">
            If this is the same person, use their existing file to add a case or transaction.
          </p>
        </div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2 ps-6 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAccept(event.target.checked)}
          className="size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
        />
        This is another person. I want to add a separate file.
      </label>
    </div>
  );
}
