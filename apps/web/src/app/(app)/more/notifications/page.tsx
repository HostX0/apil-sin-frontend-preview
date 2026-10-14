'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_KINDS,
  NOTIFICATION_KIND_AR,
  type NotificationKind,
  type NotificationPreferences,
} from '@/lib/ui-shared';
import { Button, ErrorState, Field, Input, Skeleton } from '@muhami/ui';
import {
  SettingRow,
  SettingsSection,
  SettingsShell,
  Toggle,
} from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from '@/lib/api/notifications';
import { usePushSubscription, type PushState } from '@/lib/push';

/** Lead times offered as ticks. Free-form minutes would be precision nobody wants. */
const LEAD_OPTIONS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: 10_080, label: 'One week before' },
  { minutes: 2880, label: 'Two days before' },
  { minutes: 1440, label: 'One day before' },
  { minutes: 180, label: 'Three hours before' },
  { minutes: 60, label: 'One hour before' },
];

/**
 * تنبيهاتي — per-user, not per-office.
 *
 * Whether a reminder reaches *you* is a personal setting; when the office
 * considers it too late to disturb anyone is an office setting. Both exist, and
 * this screen says which is which rather than presenting them as one list.
 */
export default function NotificationPreferencesPage() {
  const query = useNotificationPreferences();

  return (
    <SettingsShell title="My notifications" subtitle="These settings apply only to your account.">
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <PreferencesForm initial={query.data ?? DEFAULT_NOTIFICATION_PREFERENCES} />
      )}
    </SettingsShell>
  );
}

/**
 * The push row is two controls, not one.
 *
 * The preference ("do I want push?") lives on the server and follows the user
 * to every device. The subscription ("may this browser receive it?") lives in
 * the browser and is per device. Merging them into one switch produces the
 * classic bug where the toggle is green, permission was revoked in browser
 * settings, and nothing ever arrives.
 */
function PushChannel({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const push = usePushSubscription();

  const explanation: Record<PushState, string> = {
    unsupported: 'This browser does not support web notifications.',
    'server-disabled':
      'Device notifications are unavailable. In-app notifications remain available.',
    denied: 'Notifications are blocked for this site. Allow them in browser settings and refresh.',
    unsubscribed:
      'Enable device notifications to receive alerts while the app is closed, subject to device settings.',
    subscribed: 'Device notifications enabled.',
  };

  const canEnrol = push.state === 'unsubscribed' || push.state === 'subscribed';

  return (
    <div className="space-y-2">
      <SettingRow
        label="Browser notifications"
        hint="Device alerts follow your browser and phone settings."
        control={
          <Toggle
            label="Browser notifications"
            checked={enabled}
            disabled={!canEnrol}
            onChange={onChange}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-md bg-surface-sunken p-2.5">
        <p className="min-w-0 flex-1 text-xs text-ink-subtle">{explanation[push.state]}</p>

        {push.state === 'unsubscribed' ? (
          <Button
            size="sm"
            variant="secondary"
            loading={push.busy}
            onClick={() => void push.subscribe()}
          >
            Enable device notifications
          </Button>
        ) : push.state === 'subscribed' ? (
          <Button
            size="sm"
            variant="ghost"
            loading={push.busy}
            onClick={() => void push.unsubscribe()}
          >
            Disable device notifications
          </Button>
        ) : null}
      </div>

      {push.error ? (
        <p role="alert" className="text-xs text-danger">
          {push.error}
        </p>
      ) : null}

      {enabled && push.state === 'unsubscribed' ? (
        <p className="text-xs text-warning">
          Use the button above to enable notifications on this device.
        </p>
      ) : null}
    </div>
  );
}

function PreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const save = useSaveNotificationPreferences();
  const [draft, setDraft] = useState<NotificationPreferences>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDraft(initial), [initial]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const kindEnabled = (kind: NotificationKind) => draft.kinds?.[kind] !== false;

  const submit = async () => {
    setError(null);
    try {
      await save.mutateAsync(draft);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.messageAr : 'Could not save.');
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <SettingsSection title="Notification channels">
        <SettingRow
          label="In the app"
          hint="The notification centre and unread badge."
          control={
            <Toggle
              label="In the app"
              checked={draft.inApp}
              onChange={(checked) => setDraft({ ...draft, inApp: checked })}
            />
          }
        />
        <SettingRow
          label="Email"
          control={
            <Toggle
              label="Email"
              checked={draft.email}
              onChange={(checked) => setDraft({ ...draft, email: checked })}
            />
          }
        />
        <PushChannel
          enabled={draft.push}
          onChange={(checked) => setDraft({ ...draft, push: checked })}
        />
      </SettingsSection>

      <SettingsSection
        title="Hearing reminders"
        description="Choose reminder times. One reminder is sent for each selected time, up to four."
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          {LEAD_OPTIONS.map((option) => {
            const checked = draft.hearingLeadMinutes.includes(option.minutes);
            // Four is the schema's cap; past that the reminders stop being
            // signal and the lawyer starts ignoring all of them.
            const atCap = !checked && draft.hearingLeadMinutes.length >= 4;

            return (
              <label
                key={option.minutes}
                className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 text-sm hover:bg-surface-sunken"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={atCap}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      hearingLeadMinutes: checked
                        ? draft.hearingLeadMinutes.filter((value) => value !== option.minutes)
                        : [...draft.hearingLeadMinutes, option.minutes].sort((a, b) => b - a),
                    })
                  }
                  className="size-4 shrink-0 accent-brand"
                />
                <span className="text-ink">{option.label}</span>
              </label>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Notification types">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {NOTIFICATION_KINDS.map((kind) => (
            <label
              key={kind}
              className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 text-sm hover:bg-surface-sunken"
            >
              <input
                type="checkbox"
                checked={kindEnabled(kind)}
                onChange={() =>
                  setDraft({
                    ...draft,
                    kinds: { ...draft.kinds, [kind]: !kindEnabled(kind) },
                  })
                }
                className="size-4 shrink-0 accent-brand"
              />
              <span className="text-ink">{NOTIFICATION_KIND_AR[kind]}</span>
            </label>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Quiet hours"
        description="Choose when you do not want alerts. Reminders are delayed until this period ends."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="of">
            {(props) => (
              <Input
                {...props}
                type="time"
                dir="ltr"
                className="text-start"
                value={draft.quietFrom ?? ''}
                onChange={(event) =>
                  setDraft({ ...draft, quietFrom: event.target.value || undefined })
                }
              />
            )}
          </Field>
          <Field label="To">
            {(props) => (
              <Input
                {...props}
                type="time"
                dir="ltr"
                className="text-start"
                value={draft.quietTo ?? ''}
                onChange={(event) =>
                  setDraft({ ...draft, quietTo: event.target.value || undefined })
                }
              />
            )}
          </Field>
        </div>
      </SettingsSection>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface p-3  lg:bottom-0 lg:ps-64">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button onClick={() => void submit()} loading={save.isPending} disabled={!dirty}>
            Save notifications
          </Button>
          {dirty ? (
            <Button variant="ghost" size="sm" onClick={() => setDraft(initial)}>
              Reset
            </Button>
          ) : null}
          {saved ? <span className="text-sm text-success">Saved.</span> : null}
        </div>
      </div>
    </div>
  );
}
