'use client';

import { AlertTriangle, Download, HardDriveDownload, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  APP_NAME_AR,
  EXPORT_FORMATS,
  EXPORT_FORMAT_AR,
  EXPORT_FORMAT_HINT_AR,
  formatLongDateAr,
  type ExportFormat,
  type ImportReport,
  type OfficeArchive,
} from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Skeleton,
  cn,
} from '@muhami/ui';
import { SettingsSection, SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import {
  useBackups,
  useDownloadBackup,
  useExportOffice,
  useImportArchive,
  useRunBackup,
} from '@/lib/api/portability';
import { useAuth } from '@/lib/auth-context';

/**
 * النسخ الاحتياطي والتصدير.
 *
 * The screen that answers "what happens to my files if this system goes away".
 * For an Iraqi sole practitioner whose hosting arrangement may end without
 * notice, that is not a hypothetical, so the export is deliberately prominent
 * and the copy says plainly what is and is not in the file.
 */
export default function BackupPage() {
  const { user } = useAuth();

  return (
    <SettingsShell
      title="Backups and export"
      subtitle="Your data belongs to you. Download a copy whenever you need it."
      permission="backup:run"
    >
      <div className="space-y-5">
        <ExportSection />
        <BackupsSection />
        <ImportSection officeName={user?.officeName ?? ''} />
      </div>
    </SettingsShell>
  );
}

function ExportSection() {
  const exportOffice = useExportOffice();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeArchived, setIncludeArchived] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setDone(null);
    try {
      const result = await exportOffice.mutateAsync({ format, includeArchived });
      setDone(`${result.fileName} · ${Math.round(result.sizeBytes / 1024)} KB`);
    } catch {
      setError('Could not create the export. Please try again.');
    }
  };

  return (
    <SettingsSection
      title="Export office data"
      description="Download clients, cases, transactions, appointments and finances. Choose the full archive for a future restore."
    >
      <div className="space-y-2">
        {EXPORT_FORMATS.map((option) => (
          <label
            key={option}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
              format === option
                ? 'border-brand bg-brand-subtle/30'
                : 'border-line hover:bg-surface-sunken',
            )}
          >
            <input
              type="radio"
              name="export-format"
              checked={format === option}
              onChange={() => setFormat(option)}
              className="mt-1 size-4 shrink-0 accent-brand"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{EXPORT_FORMAT_AR[option]}</span>
              <span className="block text-xs text-ink-subtle">{EXPORT_FORMAT_HINT_AR[option]}</span>
            </span>
          </label>
        ))}
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
          className="size-4 shrink-0 accent-brand"
        />
        Include archived cases
      </label>

      {/* Said before the download, not after: an office that discovers this
          from a failed restore has already lost the files. */}
      <p className="rounded-md bg-warning-subtle p-3 text-xs text-warning">
        This file contains document metadata, not uploaded files. When transferring or restoring the
        office, include its stored attachments separately.
      </p>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {done ? <p className="text-sm text-success">Downloaded: {done}</p> : null}

      <Button loading={exportOffice.isPending} onClick={() => void run()}>
        <Download className="size-4" />
        Export now
      </Button>
    </SettingsSection>
  );
}

function BackupsSection() {
  const backups = useBackups();
  const runBackup = useRunBackup();
  const download = useDownloadBackup();
  const [error, setError] = useState<string | null>(null);

  return (
    <SettingsSection
      title="Automatic backups"
      description="A backup is made each night at 2:00 AM Baghdad time and retained for 30 days. The latest backup is always kept."
    >
      {backups.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : backups.isError ? (
        <ErrorState
          description={
            backups.error instanceof ApiError ? backups.error.messageAr : 'Could not load backups.'
          }
          onRetry={() => void backups.refetch()}
        />
      ) : (backups.data ?? []).length === 0 ? (
        <EmptyState
          icon={HardDriveDownload}
          title="No backups yet"
          description="The first backup is made tonight, or you can create one now."
        />
      ) : (
        <ul className="divide-y divide-line">
          {(backups.data ?? []).map((backup) => (
            <li key={backup.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{formatLongDateAr(new Date(backup.createdAt))}</p>
                <p className="ltr-numerals text-xs text-ink-subtle">
                  {Math.round(backup.sizeBytes / 1024)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                loading={download.isPending && download.variables === backup.objectKey}
                onClick={() => {
                  setError(null);
                  download.mutate(backup.objectKey, {
                    onError: () => setError('Could not download the backup. Please try again.'),
                  });
                }}
              >
                <Download className="size-4" />
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button
        variant="secondary"
        loading={runBackup.isPending}
        onClick={() => {
          setError(null);
          runBackup.mutate(undefined, {
            onError: (mutationError) =>
              setError(
                mutationError instanceof ApiError
                  ? mutationError.messageAr
                  : 'Could not create the backup.',
              ),
          });
        }}
      >
        <HardDriveDownload className="size-4" />
        Create backup now
      </Button>
    </SettingsSection>
  );
}

function ImportSection({ officeName }: { officeName: string }) {
  const importArchive = useImportArchive();
  const inputRef = useRef<HTMLInputElement>(null);

  const [archive, setArchive] = useState<OfficeArchive | null>(null);
  const [fileName, setFileName] = useState('');
  const [confirm, setConfirm] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setReport(null);

    try {
      const parsed = JSON.parse(await file.text()) as OfficeArchive;
      if (!parsed?.manifest?.formatVersion) throw new Error('not an archive');
      setArchive(parsed);
      setFileName(file.name);
    } catch {
      setArchive(null);
      setError(`This file is not a valid ${APP_NAME_AR} archive.`);
    }
  };

  const run = async (mode: 'NEW_OFFICE' | 'INTO_EMPTY') => {
    if (!archive) return;
    setError(null);

    try {
      const result = await importArchive.mutateAsync({
        archive,
        request: { mode, ...(mode === 'INTO_EMPTY' ? { confirmOfficeName: confirm } : {}) },
      });
      setReport(result);
    } catch (importError) {
      setError(importError instanceof ApiError ? importError.messageAr : 'Could not import.');
    }
  };

  return (
    <SettingsSection
      title="Import an archive"
      description="Restore an office from an export, or transfer it from another system."
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => void pick(event.target.files?.[0])}
      />

      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" />
        Choose archive file
      </Button>

      {archive ? (
        <Card className="space-y-3 p-3.5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink">{archive.manifest.office.name}</p>
            <p className="text-xs text-ink-subtle">
              {fileName} - Exported on {formatLongDateAr(new Date(archive.manifest.exportedAt))}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(archive.manifest.counts)
              .filter(([, count]) => count > 0)
              .slice(0, 8)
              .map(([table, count]) => (
                <Badge key={table} tone="neutral">
                  {archiveTableLabel(table)}: {count}
                </Badge>
              ))}
          </div>

          <div className="flex items-start gap-2 rounded-md bg-warning-subtle p-3 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Users are imported without passwords and remain disabled until you activate them and
              issue passwords in Users. Uploaded document files are not included in the archive.
            </span>
          </div>

          <Button loading={importArchive.isPending} onClick={() => void run('NEW_OFFICE')}>
            Create a new office from this archive
          </Button>

          <div className="space-y-2 border-t border-line pt-3">
            <p className="text-xs text-ink-subtle">
              Or import into this office, available only while empty. Enter the office name to
              confirm this action.
            </p>
            <Field label={`Enter: ${officeName}`}>
              {(props) => (
                <Input
                  {...props}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder={officeName}
                />
              )}
            </Field>
            <Button
              variant="danger"
              size="sm"
              disabled={confirm.trim() !== officeName.trim()}
              loading={importArchive.isPending}
              onClick={() => void run('INTO_EMPTY')}
            >
              Import into this office
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {report ? <ImportReportCard report={report} /> : null}
    </SettingsSection>
  );
}

/** The result, stated as counts rather than a reassuring tick. */
function ImportReportCard({ report }: { report: ImportReport }) {
  const shortfalls = Object.entries(report.expected).filter(
    ([table, expected]) => (report.inserted[table] ?? 0) < expected,
  );

  return (
    <Card className="space-y-3 p-3.5">
      <p className="text-sm font-semibold text-success">Imported.</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        {Object.entries(report.inserted)
          .filter(([, count]) => count > 0)
          .map(([table, count]) => (
            <div key={table} className="flex justify-between gap-2">
              <dt className="truncate text-ink-subtle">{archiveTableLabel(table)}</dt>
              <dd className="ltr-numerals text-ink">{count}</dd>
            </div>
          ))}
      </dl>

      {shortfalls.length > 0 ? (
        <div className="space-y-1 rounded-md bg-warning-subtle p-3 text-xs text-warning">
          <p className="font-semibold">Some rows were not imported:</p>
          {shortfalls.map(([table, expected]) => (
            <p key={table} className="ltr-numerals">
              {archiveTableLabel(table)}: {report.inserted[table] ?? 0} of {expected}
            </p>
          ))}
          {report.skipped.map((entry) => (
            <p key={entry.table}>{entry.reasonAr}</p>
          ))}
        </div>
      ) : null}

      {report.warningsAr.map((warning) => (
        <p key={warning} className="rounded-md bg-surface-sunken p-3 text-xs text-ink-muted">
          {warning}
        </p>
      ))}
    </Card>
  );
}

function archiveTableLabel(table: string): string {
  const labels: Record<string, string> = {
    office: 'Office details',
    roles: 'Roles',
    users: 'Sign-in accounts',
    lawyers: 'Lawyers',
    courts: 'Courts',
    clients: 'Clients',
    cases: 'Cases',
    transactions: 'Transactions',
    whatsAppAutomations: 'Message templates',
    whatsAppMessages: 'WhatsApp messages',
    caseParties: 'Case parties',
    caseAssignments: 'Lawyer assignments',
    caseStatusHistory: 'Case statuses',
    powersOfAttorney: 'Powers of attorney',
    hearings: 'Hearings',
    calendarEvents: 'Appointments',
    tasks: 'Tasks',
    documents: 'Documents',
    feeAgreements: 'Fee agreements',
    feeInstallments: 'Fee instalments',
    invoices: 'Payment receipts',
    payments: 'Payments',
    expenses: 'Expenses',
    notes: 'Notes',
    tags: 'Tags',
    tagAssignments: 'Tag links',
    savedSearches: 'Saved searches',
    deadlineRules: 'Calendar rules',
  };
  return labels[table] ?? 'Additional details';
}
