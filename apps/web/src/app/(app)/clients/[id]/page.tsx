'use client';

import { uiSystemText } from '@/lib/ui-english';

import {
  ArrowRight,
  Building2,
  MessageCircle,
  Pencil,
  Phone,
  Scale,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { CaseNumber } from '@/components/cases/case-number';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  APP_TIMEZONE,
  CLIENT_KIND_AR,
  formatIraqiMobile,
  formatLongDateAr,
  type ActivityEntry,
  type ClientDetail,
} from '@/lib/ui-shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Sheet,
  SheetContent,
  SheetFooter,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@muhami/ui';
import { CaseFormSheet } from '@/components/cases/case-form-sheet';
import { CaseStatusBadge } from '@/components/cases/case-status-badge';
import { ClientFormSheet } from '@/components/clients/client-form-sheet';
import { DocumentList } from '@/components/documents/document-list';
import { ClientFeePanel } from '@/components/finance/client-fee-panel';
import { PrintButton } from '@/components/pdf/print-button';
import { pdfPaths } from '@/lib/api/pdf';
import { ApiError } from '@/lib/api-client';
import { useCaseList } from '@/lib/api/cases';
import {
  useArchiveClient,
  useClient,
  useClientActivity,
  useToggleFavorite,
} from '@/lib/api/clients';
import { Can, useAuth } from '@/lib/auth-context';

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { can, canAny } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDetail | null>(null);
  const { data: client, isLoading, isError, error, refetch } = useClient(id);
  const favorite = useToggleFavorite(id);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !client) {
    return (
      <ErrorState
        title="Could not open the client file"
        description={error instanceof ApiError ? error.messageAr : undefined}
        traceId={error instanceof ApiError ? error.traceId : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const Icon = client.kind === 'COMPANY' ? Building2 : User;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/clients"
          aria-label="Back to clients"
          className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
        >
          {/* Forward/back follow reading direction: "back" points right in RTL. */}
          <ArrowRight className="size-5" aria-hidden />
        </Link>

        <h1 className="min-w-0 flex-1 basis-40 break-words font-display text-lg font-bold text-ink">
          {client.fullName}
        </h1>

        <Can permission="client:update">
          <button
            type="button"
            onClick={() => favorite.mutate(!client.isFavorite)}
            disabled={favorite.isPending}
            aria-label={client.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
            aria-pressed={client.isFavorite}
            className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
          >
            <Star className={cn('size-5', client.isFavorite && 'fill-warning text-warning')} />
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingClient(client);
              setEditOpen(true);
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        </Can>

        <PrintButton path={pdfPaths.clientProfile(id)} label="Print" showDownload={false} />
      </div>

      {favorite.isError ? (
        <p role="alert" className="text-sm text-danger">
          Could not update favourites. Please try again.
        </p>
      ) : null}

      <Card className="flex items-start gap-3 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm text-ink-muted">{CLIENT_KIND_AR[client.kind]}</p>
          <a
            href={`tel:${client.mobile}`}
            className="ltr-numerals flex items-center gap-1.5 text-sm font-medium text-brand"
          >
            <Phone className="size-3.5" aria-hidden />
            {formatIraqiMobile(client.mobile)}
          </a>
          <Can permission="whatsapp:send">
            <Link
              href={`/whatsapp?recipientType=client&recipientId=${client.id}`}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp message
            </Link>
          </Can>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {client.activeCaseCount > 0 ? (
              <Badge tone="brand">{client.activeCaseCount} active case</Badge>
            ) : null}
            {client.caseCount > 0 ? (
              <Badge tone="neutral">{client.caseCount} cases in total</Badge>
            ) : null}
            {client.tags.map((tag) => (
              <Badge key={tag.id} tone="neutral" dot>
                {tag.label}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList aria-label="Client file sections" className="flex-wrap overflow-x-visible">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {canAny('case:read.all', 'case:read.own') ? (
            <TabsTrigger value="cases">Cases</TabsTrigger>
          ) : null}
          {can('document:read') ? <TabsTrigger value="documents">Documents</TabsTrigger> : null}
          {can('finance:read.summary') ? (
            <TabsTrigger value="finance">Fees and payments</TabsTrigger>
          ) : null}
          <TabsTrigger value="activity">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab client={client} />
          <Can permission="client:delete">
            <ArchiveClientAction client={client} />
          </Can>
        </TabsContent>

        <TabsContent value="cases">
          <ClientCasesTab clientId={id} clientName={client.fullName} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentList
            filters={{ clientId: id, sort: 'recent' }}
            clientId={id}
            emptyDescription="Upload the client's ID, contracts or other documents here."
          />
        </TabsContent>

        <TabsContent value="finance">
          <ClientFinanceTab clientId={id} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab clientId={id} />
        </TabsContent>
      </Tabs>

      {editOpen && editingClient ? (
        <ClientFormSheet open onOpenChange={setEditOpen} client={editingClient} />
      ) : null}
    </div>
  );
}

function OverviewTab({ client }: { client: ClientDetail }) {
  /** `ltr` keeps numbers and addresses from being reversed inside the RTL page. */
  const rows: Array<{ label: string; value: string | null; ltr?: boolean }> = [
    { label: 'Mobile number', value: formatIraqiMobile(client.mobile), ltr: true },
    {
      label: 'Additional phone',
      value: client.phoneSecondary ? formatIraqiMobile(client.phoneSecondary) : null,
      ltr: true,
    },
    {
      label: client.kind === 'COMPANY' ? 'Registration number' : 'National ID number',
      value: client.nationalId,
      ltr: true,
    },
    { label: 'Email', value: client.email, ltr: true },
    { label: 'Address', value: client.address },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <dl className="divide-y divide-line">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 p-3.5">
              <dt className="w-32 shrink-0 text-sm text-ink-muted">{row.label}</dt>
              <dd
                className={cn(
                  'min-w-0 flex-1 break-words text-sm',
                  row.value ? 'text-ink' : 'text-ink-subtle',
                  row.ltr && row.value ? 'ltr-numerals' : '',
                )}
              >
                {row.value ?? '—'}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {client.notes ? (
        <Card className="p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Notes
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{client.notes}</p>
        </Card>
      ) : null}

      <p className="text-center text-xs text-ink-subtle">
        Added on {formatLongDateAr(new Date(client.createdAt))}
      </p>
    </div>
  );
}

/**
 * Archive (soft delete).
 *
 * A confirmation sheet rather than `window.confirm`: the native dialog is not
 * styleable, renders LTR inside an RTL document, and cannot explain that this is
 * reversible. Deleting a client is uncommon enough to deserve a real sentence.
 */
function ArchiveClientAction({ client }: { client: ClientDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archive = useArchiveClient();

  const blocked = client.caseCount > 0;

  return (
    <>
      <div className="pt-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-subtle"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <Trash2 className="size-4" />
          Delete client
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="Delete client">
          <div className="space-y-4">
            {blocked ? (
              <p className="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning">
                Cannot delete "{client.fullName}" because they have {client.caseCount} linked cases.
                Archive the cases first.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-ink-muted">
                Delete "{client.fullName}" from the lists. Deleted clients can be restored from the
                archive within 90 days.
              </p>
            )}

            {error ? (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <SheetFooter>
              <Button variant="secondary" block onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                block
                disabled={blocked}
                loading={archive.isPending}
                onClick={async () => {
                  try {
                    await archive.mutateAsync(client.id);
                    setOpen(false);
                    router.replace('/clients');
                  } catch (caught) {
                    setError(
                      caught instanceof ApiError
                        ? caught.messageAr
                        : 'Could not delete. Please try again.',
                    );
                  }
                }}
              >
                Delete
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * The client's cases.
 *
 * Reuses the cases list endpoint with a `clientId` filter rather than adding a
 * nested route — one query path, one set of permissions, one place to fix.
 */
function ClientCasesTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [formOpen, setFormOpen] = useState(false);
  const query = useCaseList({ clientId, sort: 'activity' });
  const cases = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-3">
      {cases.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No cases for this client"
          description={`Record the first case for ${clientName}.`}
          action={
            <Can permission="case:create">
              <Button size="sm" onClick={() => setFormOpen(true)}>
                Record case
              </Button>
            </Can>
          }
        />
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-line">
              {cases.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/cases/${item.id}`}
                    className="flex flex-col gap-1 p-3.5 transition-colors hover:bg-surface-sunken"
                  >
                    <span className="flex items-center gap-2">
                      <span className="ltr-numerals text-sm font-semibold text-ink">
                        <CaseNumber value={item.numberDisplay} />
                      </span>
                      <CaseStatusBadge status={item.status} />
                    </span>
                    <span className="truncate text-xs text-ink-muted">{item.subject}</span>
                    <span className="text-xs text-ink-subtle">{item.courtName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {query.hasNextPage ? (
            <Button
              variant="secondary"
              block
              size="sm"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Show more
            </Button>
          ) : null}

          <Can permission="case:create">
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
              <Scale className="size-4" />
              New case for this client
            </Button>
          </Can>
        </>
      )}

      <CaseFormSheet open={formOpen} onOpenChange={setFormOpen} defaultClientId={clientId} />
    </div>
  );
}

function ClientFinanceTab({ clientId }: { clientId: string }) {
  return <ClientFeePanel clientId={clientId} />;
}

function ActivityTab({ clientId }: { clientId: string }) {
  const { data, isLoading, isError, refetch } = useClientActivity(clientId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No recorded activity"
        description="Changes to this client file appear here."
      />
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-line">
        {data.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </Card>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const at = new Date(entry.createdAt);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(at);

  return (
    <li className="flex items-start gap-3 p-3.5">
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          entry.action === 'CREATE'
            ? 'bg-success'
            : entry.action === 'DELETE'
              ? 'bg-danger'
              : 'bg-info',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{uiSystemText(entry.summaryAr)}</p>
        <p className="text-xs text-ink-subtle">
          {entry.actorLabel ? `${entry.actorLabel} · ` : ''}
          {formatLongDateAr(at)} · {time}
        </p>
      </div>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
