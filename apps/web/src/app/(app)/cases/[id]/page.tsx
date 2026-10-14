'use client';

import { CaseNumber } from '@/components/cases/case-number';
import { AlertTriangle, ArrowRight, ChevronDown, Pencil, Plus, Star } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  CASE_STATUS_AR,
  CASE_TYPE_AR,
  PARTY_ROLE_AR,
  POA_TYPE_AR,
  PRIORITY_AR,
  formatLongDateAr,
  formatMoney,
  type CaseDetail,
  type PoaSummary,
} from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@muhami/ui';
import { CaseFormSheet } from '@/components/cases/case-form-sheet';
import { CaseHearingsTab } from '@/components/cases/case-hearings-tab';
import { PoaFormSheet } from '@/components/cases/poa-form-sheet';
import { CaseStatusBadge, caseStatusTone } from '@/components/cases/case-status-badge';
import { StatusChangeSheet } from '@/components/cases/status-change-sheet';
import { DocumentList } from '@/components/documents/document-list';
import { FinancePanel } from '@/components/finance/finance-panel';
import { PrintButton } from '@/components/pdf/print-button';
import { pdfPaths } from '@/lib/api/pdf';
import { useCaseBalance } from '@/lib/api/finance';
import { ApiError } from '@/lib/api-client';
import { useCase, useToggleCaseFavorite } from '@/lib/api/cases';
import { Can, useAuth } from '@/lib/auth-context';

/**
 * Case workspace.
 *
 * The status is an action, not a read-only badge. The mobile header is allowed
 * to wrap its secondary controls instead of shrinking the case number into an
 * unreadable sliver on a phone.
 */
export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { can } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseDetail | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  const { data: legalCase, isLoading, isError, error, refetch } = useCase(id);
  const favorite = useToggleCaseFavorite(id);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !legalCase) {
    return (
      <ErrorState
        title="Could not open the case file"
        description={error instanceof ApiError ? error.messageAr : undefined}
        traceId={error instanceof ApiError ? error.traceId : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/cases"
          aria-label="Back to cases"
          className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
        >
          <ArrowRight className="size-5" aria-hidden />
        </Link>

        <div className="min-w-0 flex-1 basis-[14rem]">
          <h1 className="ltr-numerals truncate font-display text-lg font-bold text-ink">
            <CaseNumber value={legalCase.numberDisplay} />
          </h1>
          <p className="truncate text-xs text-ink-subtle">
            {legalCase.courtName} · {CASE_TYPE_AR[legalCase.caseType]}
          </p>
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <Can permission="case:update">
            <button
              type="button"
              onClick={() => favorite.mutate(!legalCase.isFavorite)}
              disabled={favorite.isPending}
              aria-label={legalCase.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={legalCase.isFavorite}
              className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
            >
              <Star className={cn('size-5', legalCase.isFavorite && 'fill-warning text-warning')} />
            </button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingCase(legalCase);
                setEditOpen(true);
              }}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          </Can>

          <PrintButton path={pdfPaths.caseSummary(id)} label="Summary" showDownload={false} />
        </div>
      </div>

      {favorite.isError ? (
        <p role="alert" className="text-sm text-danger">
          Could not update favourites. Please try again.
        </p>
      ) : null}

      <Can
        permission="case:status.change"
        fallback={
          <div className="flex items-center gap-2">
            <CaseStatusBadge status={legalCase.status} />
          </div>
        }
      >
        <button
          type="button"
          onClick={() => setStatusOpen(true)}
          className={cn(
            'flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border p-3 text-start transition-colors',
            'border-line-strong bg-surface hover:bg-surface-sunken',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-sm text-ink-muted">Case status</span>
            <Badge tone={caseStatusTone(legalCase.status)} dot>
              {CASE_STATUS_AR[legalCase.status]}
            </Badge>
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink-subtle" aria-hidden />
        </button>
      </Can>

      <ComplianceFlags flags={legalCase.compliance} />

      <Tabs defaultValue="overview">
        <TabsList aria-label="Case file sections" className="flex-wrap overflow-x-visible">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          {can('poa:read') ? <TabsTrigger value="poa">Powers of attorney</TabsTrigger> : null}
          {can('hearing:read') ? <TabsTrigger value="hearings">Hearings</TabsTrigger> : null}
          {can('document:read') ? <TabsTrigger value="documents">Documents</TabsTrigger> : null}
          {can('finance:read.summary') ? (
            <TabsTrigger value="finance">Fees and payments</TabsTrigger>
          ) : null}
          <TabsTrigger value="timeline">Status history</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab legalCase={legalCase} />
        </TabsContent>

        <TabsContent value="parties">
          <PartiesTab legalCase={legalCase} />
        </TabsContent>

        <TabsContent value="poa">
          <PoaTab legalCase={legalCase} />
        </TabsContent>

        <TabsContent value="hearings">
          <CaseHearingsTab caseId={id} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentList
            filters={{ caseId: id, sort: 'recent' }}
            caseId={id}
            emptyDescription="Upload powers of attorney, contracts or court documents for this case."
          />
        </TabsContent>

        <TabsContent value="finance">
          <CaseFinanceTab caseId={id} clientId={legalCase.clientId} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab legalCase={legalCase} />
        </TabsContent>
      </Tabs>

      {editOpen && editingCase ? (
        <CaseFormSheet open onOpenChange={setEditOpen} legalCase={editingCase} />
      ) : null}
      <StatusChangeSheet open={statusOpen} onOpenChange={setStatusOpen} legalCase={legalCase} />
    </div>
  );
}

function ComplianceFlags({ flags }: { flags: CaseDetail['compliance'] }) {
  const items = [
    flags.missingCertifiedPoa ? 'No valid certified power of attorney' : null,
    flags.missingFeeAgreement ? 'No fee agreement' : null,
    flags.outstandingBalance
      ? `Outstanding fees: ${formatMoney(BigInt(flags.outstandingBalance))}`
      : null,
  ].filter((item): item is string => item !== null);

  if (items.length === 0) return null;

  return (
    <div className="space-y-1 rounded-lg border border-warning/40 bg-warning-subtle p-3">
      {items.map((item) => (
        <p key={item} className="flex items-start gap-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{item}</span>
        </p>
      ))}
    </div>
  );
}

function CaseFinanceTab({ caseId, clientId }: { caseId: string; clientId: string }) {
  const { data, isLoading } = useCaseBalance(caseId);
  return <FinancePanel balance={data} isLoading={isLoading} caseId={caseId} clientId={clientId} />;
}

function OverviewTab({ legalCase }: { legalCase: CaseDetail }) {
  const rows: Array<{ label: string; value: string | null; ltr?: boolean }> = [
    { label: 'Client', value: legalCase.clientName },
    { label: 'Client role', value: PARTY_ROLE_AR[legalCase.clientRole] },
    { label: 'Opponent', value: legalCase.opponentName },
    { label: 'Court', value: legalCase.courtName },
    { label: 'Case type', value: CASE_TYPE_AR[legalCase.caseType] },
    {
      label: 'Registration date',
      value: formatLongDateAr(new Date(legalCase.openedAt)),
      ltr: false,
    },
    {
      label: 'Claim value',
      value: legalCase.claimValue ? formatMoney(BigInt(legalCase.claimValue)) : null,
      ltr: true,
    },
    { label: 'Judge', value: legalCase.judgeName },
    { label: 'Court panel', value: legalCase.chamber },
    { label: 'Priority', value: PRIORITY_AR[legalCase.priority] },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          Case subject
        </p>
        <p className="text-sm leading-relaxed text-ink">{legalCase.subject}</p>
      </Card>

      <Card>
        <dl className="divide-y divide-line">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 p-3.5 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <dt className="text-sm text-ink-muted">{row.label}</dt>
              <dd
                className={cn(
                  'min-w-0 break-words text-sm',
                  row.value ? 'text-ink' : 'text-ink-subtle',
                  row.ltr && row.value ? 'ltr-numerals' : '',
                )}
              >
                {row.label === 'Client' && row.value ? (
                  <Link
                    href={`/clients/${legalCase.clientId}`}
                    className="text-brand hover:underline"
                  >
                    {row.value}
                  </Link>
                ) : (
                  (row.value ?? '—')
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {legalCase.assignedLawyers.length > 0 ? (
        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Assigned lawyers
          </p>
          <div className="flex flex-wrap gap-1.5">
            {legalCase.assignedLawyers.map((lawyer) => (
              <Badge key={lawyer.id} tone={lawyer.isLead ? 'brand' : 'neutral'}>
                {lawyer.fullName}
                {lawyer.isLead ? ' - Lead lawyer' : ''}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CountTile label="Hearings" value={legalCase.counts.hearings} />
        <CountTile label="Documents" value={legalCase.counts.documents} />
        <CountTile label="Tasks" value={legalCase.counts.tasks} />
        <CountTile label="Notes" value={legalCase.counts.notes} />
      </div>
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface flex min-h-20 flex-col items-center justify-center gap-0.5 p-3">
      <span className="ltr-numerals text-lg font-bold tabular-nums text-ink">{value}</span>
      <span className="text-xs text-ink-subtle">{label}</span>
    </div>
  );
}

function PartiesTab({ legalCase }: { legalCase: CaseDetail }) {
  return (
    <Card>
      <ul className="divide-y divide-line">
        {legalCase.parties.map((party) => (
          <li key={party.id} className="space-y-1 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={party.side === 'CLIENT' ? 'brand' : 'neutral'}>
                {party.side === 'CLIENT' ? 'Our client' : 'Opponent'}
              </Badge>
              <span className="text-xs text-ink-subtle">{PARTY_ROLE_AR[party.role]}</span>
            </div>
            <p className="break-words text-sm font-medium text-ink">{party.name}</p>
            {party.counselName ? (
              <p className="break-words text-xs text-ink-muted">
                Representative: {party.counselName}
              </p>
            ) : null}
            {party.phone ? (
              <p className="ltr-numerals text-xs text-ink-subtle">{party.phone}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PoaTab({ legalCase }: { legalCase: CaseDetail }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PoaSummary | null>(null);

  const addButton = (
    <Can permission="poa:create">
      <Button size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="size-4" />
        Record power of attorney
      </Button>
    </Can>
  );

  return (
    <div className="space-y-3">
      {legalCase.powersOfAttorney.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Case powers of attorney</p>
            <p className="text-xs text-ink-subtle">
              Certification, expiry and supporting documents are part of the compliance checks.
            </p>
          </div>
          {addButton}
        </div>
      ) : null}

      {legalCase.powersOfAttorney.length === 0 ? (
        <EmptyState
          title="No power of attorney recorded"
          description="Record the power of attorney and its certification to clear the missing certification follow-up."
          action={addButton}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {legalCase.powersOfAttorney.map((poa) => (
              <li key={poa.id} className="space-y-2 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ltr-numerals text-sm font-semibold text-ink">
                        {poa.number}
                      </span>
                      <Badge tone={poa.certified ? 'success' : 'warning'}>
                        {poa.certified ? 'Certified' : 'Not certified'}
                      </Badge>
                      {poa.isExpired ? <Badge tone="danger">Expired</Badge> : null}
                      <Badge tone="neutral">{POA_TYPE_AR[poa.type]}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
                      Issued on {formatLongDateAr(new Date(poa.issueDate))}
                      {poa.issuer ? ` · ${poa.issuer}` : ''}
                      {poa.expiresAt
                        ? ` - Expires ${formatLongDateAr(new Date(poa.expiresAt))}`
                        : ''}
                    </p>
                    {poa.scope ? (
                      <p className="mt-1 text-xs text-ink-muted">Scope: {poa.scope}</p>
                    ) : null}
                  </div>

                  <Can permission="poa:update">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(poa)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </Can>
                </div>

                <PrintButton
                  path={pdfPaths.powerOfAttorney(legalCase.id, poa.id)}
                  label="Power of attorney statement"
                  variant="ghost"
                  showDownload={false}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PoaFormSheet open={createOpen} onOpenChange={setCreateOpen} legalCase={legalCase} />
      <PoaFormSheet
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        legalCase={legalCase}
        poa={editing}
      />
    </div>
  );
}

function TimelineTab({ legalCase }: { legalCase: CaseDetail }) {
  if (legalCase.statusHistory.length === 0) {
    return <EmptyState title="No history yet" />;
  }

  return (
    <Card>
      <ul className="divide-y divide-line">
        {legalCase.statusHistory.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 p-3.5">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm text-ink">
                {entry.fromStatus
                  ? `of «${CASE_STATUS_AR[entry.fromStatus]}» To «${CASE_STATUS_AR[entry.toStatus]}»`
                  : `Case registered with status "${CASE_STATUS_AR[entry.toStatus]}»`}
              </p>
              {entry.reason ? <p className="text-xs text-ink-muted">{entry.reason}</p> : null}
              {entry.documentId ? <Badge tone="neutral">Supporting document saved</Badge> : null}
              <p className="text-xs text-ink-subtle">
                {formatLongDateAr(new Date(entry.effectiveAt))}
                {entry.actorLabel ? ` · ${entry.actorLabel}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
