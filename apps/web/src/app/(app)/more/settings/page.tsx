'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Mail } from 'lucide-react';
import Link from 'next/link';
import {
  CASE_TYPE_CODES,
  DENSITIES,
  DENSITY_AR,
  NUMERAL_STYLES,
  NUMERAL_STYLE_AR,
  PAPER_SIZES,
  formatCaseNumber,
  type OfficeSettings,
  type OfficeSettingsPatch,
} from '@/lib/ui-shared';
import { Button, Card, ErrorState, Field, Input, Skeleton } from '@muhami/ui';
import {
  SettingRow,
  SettingsSection,
  SettingsShell,
  Toggle,
} from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import { useOfficeSettings, useUpdateOfficeSettings } from '@/lib/api/office';
import { useAuth } from '@/lib/auth-context';

/**
 * إعدادات المكتب — the settings registry, one screen.
 *
 * The brief listed these as separate rows (التفضيلات · الطباعة · التنبيهات · اللغة
 * والتاريخ). They are one screen here because there are eleven settings in total:
 * five screens of two controls each is navigation for its own sake, and it hides
 * the fact that the case-number template and the receipt prefix are the only two
 * that a lawyer will ever hunt for.
 */
export default function SettingsPage() {
  const query = useOfficeSettings();
  const { user, can } = useAuth();

  return (
    <SettingsShell
      title="Office settings"
      subtitle="These settings apply to everyone in the office."
      permission="settings:read"
    >
      {user?.roleKey === 'OWNER' && can('settings:update') ? (
        <Card>
          <Link
            href="/more/mailboxes"
            className="flex items-center gap-3 rounded-xl p-4 transition-colors hover:bg-surface-sunken"
          >
            <Mail aria-hidden className="size-5 shrink-0 text-brand" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Employee email</span>
              <span className="mt-1 block text-xs leading-5 text-ink-subtle">
                Add company email addresses and set employee passwords.
              </span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-subtle" />
          </Link>
        </Card>
      ) : null}
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : query.data ? (
        <SettingsForm settings={query.data} />
      ) : null}
    </SettingsShell>
  );
}

function SettingsForm({ settings }: { settings: OfficeSettings }) {
  const { can } = useAuth();
  const disabled = !can('settings:update');

  const mutation = useUpdateOfficeSettings();
  const [draft, setDraft] = useState<OfficeSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server wins when it answers — the save response is the authority, and a
  // rejected value must not linger on screen looking accepted.
  useEffect(() => setDraft(settings), [settings]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const patch = <S extends keyof OfficeSettings>(
    section: S,
    values: Partial<OfficeSettings[S]>,
  ) => {
    setDraft((current) => ({ ...current, [section]: { ...current[section], ...values } }));
  };

  const save = async () => {
    setError(null);
    try {
      // The whole draft is sent as the patch: the server merges section-wise and
      // re-parses, so an unchanged section is a no-op rather than a blank.
      await mutation.mutateAsync(draft as OfficeSettingsPatch);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.messageAr : 'Could not save.');
    }
  };

  const templatePreview = safePreview(draft.caseNumber.template);

  return (
    <div className="space-y-5 pb-24">
      <SettingsSection title="General">
        <SettingRow
          label="Inactive case threshold"
          hint="Days without activity before a case appears in the inactive cases list."
          control={
            <Input
              aria-label="Inactive case threshold in days"
              type="number"
              min={7}
              max={365}
              dir="ltr"
              className="text-start"
              value={draft.general.inactiveCaseDays}
              disabled={disabled}
              onChange={(event) =>
                patch('general', { inactiveCaseDays: Number(event.target.value) })
              }
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Case numbering"
        description="Controls the case number shown on screens and printed documents."
      >
        <Field
          label="Case number format"
          error={templatePreview.error}
          hint={templatePreview.error ? undefined : `Example: ${templatePreview.example}`}
        >
          {(props) => (
            <select
              {...props}
              className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
              value={draft.caseNumber.template}
              disabled={disabled}
              onChange={(event) => patch('caseNumber', { template: event.target.value })}
            >
              {!CASE_NUMBER_FORMATS.some((format) => format.value === draft.caseNumber.template) ? (
                <option value={draft.caseNumber.template}>Current office format</option>
              ) : null}
              {CASE_NUMBER_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <p className="text-xs text-ink-subtle">
          Choose the order of serial number, case type code and year. The example above shows the
          result.
        </p>
      </SettingsSection>

      <SettingsSection title="Printing">
        <SettingRow
          label="Paper size"
          control={
            <Select
              label="Paper size"
              value={draft.printing.paperSize}
              disabled={disabled}
              options={PAPER_SIZES.map((size) => ({ value: size, label: size }))}
              onChange={(value) =>
                patch('printing', { paperSize: value as OfficeSettings['printing']['paperSize'] })
              }
            />
          }
        />
        <SettingRow
          label="Show logo"
          control={
            <Toggle
              label="Show logo"
              checked={draft.printing.showLogo}
              disabled={disabled}
              onChange={(checked) => patch('printing', { showLogo: checked })}
            />
          }
        />
        <SettingRow
          label="Show stamp"
          control={
            <Toggle
              label="Show stamp"
              checked={draft.printing.showStamp}
              disabled={disabled}
              onChange={(checked) => patch('printing', { showStamp: checked })}
            />
          }
        />
        <SettingRow
          label="Show signature"
          hint="Add the signature image in Office details first."
          control={
            <Toggle
              label="Show signature"
              checked={draft.printing.showSignature}
              disabled={disabled}
              onChange={(checked) => patch('printing', { showSignature: checked })}
            />
          }
        />
        <Field label="Document footer note">
          {(props) => (
            <Input
              {...props}
              value={draft.printing.footerNoteAr}
              disabled={disabled}
              maxLength={300}
              onChange={(event) => patch('printing', { footerNoteAr: event.target.value })}
            />
          )}
        </Field>
      </SettingsSection>

      <SettingsSection title="Finance">
        <SettingRow
          label="Receipt number prefix"
          hint="Printed before the serial number. Example: R-000123."
          control={
            <Input
              aria-label="Receipt number prefix"
              value={draft.finance.receiptPrefix}
              disabled={disabled}
              maxLength={8}
              onChange={(event) => patch('finance', { receiptPrefix: event.target.value })}
            />
          }
        />
        <SettingRow
          label="Receipt number digits"
          control={
            <Input
              aria-label="Receipt number digits"
              type="number"
              min={3}
              max={10}
              dir="ltr"
              className="text-start"
              value={draft.finance.receiptNumberWidth}
              disabled={disabled}
              onChange={(event) =>
                patch('finance', { receiptNumberWidth: Number(event.target.value) })
              }
            />
          }
        />
        <SettingRow
          label="Warn when payments exceed agreed fees"
          control={
            <Toggle
              label="Warn when fees are exceeded"
              checked={draft.finance.warnOnOverpayment}
              disabled={disabled}
              onChange={(checked) => patch('finance', { warnOnOverpayment: checked })}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Language, dates and appearance">
        <SettingRow
          label="Number format"
          control={
            <Select
              label="Number format"
              value={draft.localization.numerals}
              disabled={disabled}
              options={NUMERAL_STYLES.map((style) => ({
                value: style,
                label: NUMERAL_STYLE_AR[style],
              }))}
              onChange={(value) =>
                patch('localization', {
                  numerals: value as OfficeSettings['localization']['numerals'],
                })
              }
            />
          }
        />
        <SettingRow
          label="Show Hijri dates"
          hint="Shown beside Gregorian dates. Date entry and searching use Gregorian dates."
          control={
            <Toggle
              label="Show Hijri dates"
              checked={draft.localization.showHijri}
              disabled={disabled}
              onChange={(checked) => patch('localization', { showHijri: checked })}
            />
          }
        />
        <SettingRow
          label="Display density"
          control={
            <Select
              label="Display density"
              value={draft.localization.density}
              disabled={disabled}
              options={DENSITIES.map((density) => ({
                value: density,
                label: DENSITY_AR[density],
              }))}
              onChange={(value) =>
                patch('localization', {
                  density: value as OfficeSettings['localization']['density'],
                })
              }
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Shared office quiet hours. Each user may also add their own quiet hours."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quiet hours start">
            {(props) => (
              <Input
                {...props}
                type="time"
                dir="ltr"
                className="text-start"
                value={draft.notifications.quietFrom ?? ''}
                disabled={disabled}
                onChange={(event) =>
                  patch('notifications', { quietFrom: event.target.value || undefined })
                }
              />
            )}
          </Field>
          <Field label="Quiet hours end">
            {(props) => (
              <Input
                {...props}
                type="time"
                dir="ltr"
                className="text-start"
                value={draft.notifications.quietTo ?? ''}
                disabled={disabled}
                onChange={(event) =>
                  patch('notifications', { quietTo: event.target.value || undefined })
                }
              />
            )}
          </Field>
        </div>
        <p className="text-xs text-ink-subtle">
          Reminders due during quiet hours are delayed until the period ends.
        </p>
      </SettingsSection>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {!disabled ? (
        // Fixed above the bottom navigation: a settings screen this long would
        // otherwise hide its own save button below the fold.
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface p-3  lg:bottom-0 lg:ps-64">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Button
              onClick={() => void save()}
              loading={mutation.isPending}
              disabled={!dirty || Boolean(templatePreview.error)}
            >
              Save settings
            </Button>
            {dirty ? (
              <Button variant="ghost" size="sm" onClick={() => setDraft(settings)}>
                Discard changes
              </Button>
            ) : null}
            {saved ? <span className="text-sm text-success">Saved.</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 disabled:bg-surface-sunken disabled:text-ink-subtle"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Render the template against a sample so the effect is visible while typing.
 *
 * The same three-token rule the API enforces, restated in Arabic here — the
 * server is still the authority, this just avoids a round trip to learn it.
 */
const CASE_NUMBER_FORMATS = [
  { value: '{serial}/{typeCode}/{year}', label: 'Serial / type code / year' },
  { value: '{year}/{typeCode}/{serial}', label: 'Year / type code / serial' },
  { value: '{serial}-{typeCode}-{year}', label: 'Serial - type code - year' },
] as const;

function safePreview(template: string): { example: string; error?: string } {
  const missing = ['{serial}', '{typeCode}', '{year}'].filter((token) => !template.includes(token));

  if (missing.length > 0) {
    return {
      example: '',
      error: 'Choose a format containing the serial number, type code and year.',
    };
  }

  return {
    example: formatCaseNumber(
      { serial: 1234, typeCode: CASE_TYPE_CODES[0]?.code ?? 'ب', year: new Date().getFullYear() },
      template,
    ),
  };
}
