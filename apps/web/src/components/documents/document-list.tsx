'use client';

import { Download, Eye, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { useState } from 'react';
import {
  DOCUMENT_TYPE_AR,
  formatFileSize,
  formatLongDateAr,
  isImageMime,
  type DocumentListItem,
  type ListDocumentsQuery,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, cn } from '@muhami/ui';
import { DocumentUploadSheet } from '@/components/documents/document-upload-sheet';
import { ApiError } from '@/lib/api-client';
import { useDocumentList, useDownloadUrl } from '@/lib/api/documents';
import { Can, useAuth } from '@/lib/auth-context';

/**
 * Reusable document list — the whole library, a case's documents, or a client's.
 *
 * One component with a filter rather than three near-identical screens: the same
 * permissions, the same empty states, one place to fix a bug.
 */
export function DocumentList({
  filters,
  caseId,
  transactionId,
  clientId,
  allowUpload = true,
  emptyDescription,
}: {
  filters: Partial<ListDocumentsQuery>;
  caseId?: string;
  transactionId?: string;
  clientId?: string;
  allowUpload?: boolean;
  emptyDescription?: string;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { can } = useAuth();
  const hasFileContext = Boolean(caseId || transactionId || clientId);
  const canUpload = allowUpload && hasFileContext && can('document:upload');
  const query = useDocumentList(filters);
  const documents = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        description={query.error instanceof ApiError ? query.error.messageAr : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-3">
      {canUpload ? (
        <Button variant="secondary" size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" aria-hidden />
          Add document
        </Button>
      ) : null}
      {!hasFileContext && can('document:upload') ? (
        <p className="text-sm leading-7 text-ink-muted">
          To add a document, open its case, transaction or client file and choose Add document.
        </p>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description={
            emptyDescription ??
            (canUpload
              ? 'Add a file or scan the papers with your camera to save them here.'
              : 'Documents saved in this file will appear here.')
          }
        />
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-line">
              {documents.map((document) => (
                <DocumentRow key={document.id} document={document} />
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
        </>
      )}

      <DocumentUploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        caseId={caseId}
        transactionId={transactionId}
        clientId={clientId}
      />
    </div>
  );
}

function DocumentRow({ document: item }: { document: DocumentListItem }) {
  const download = useDownloadUrl();
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch a fresh signed URL at click time, then open it.
   *
   * The URL is never rendered into the DOM ahead of time: it expires in minutes,
   * and a stale href would fail exactly when someone taps it in a courtroom.
   */
  const open = async (disposition: 'inline' | 'attachment') => {
    setError(null);
    // Open the preview while the click still has browser user activation.
    const preview = disposition === 'inline' ? window.open('about:blank', '_blank') : null;
    if (preview) preview.opener = null;
    if (disposition === 'inline' && !preview) {
      setError('The preview window did not open. Allow pop-ups for this site, then try again.');
      return;
    }
    try {
      const ticket = await download.mutateAsync({ id: item.id, disposition });
      if (preview) preview.location.replace(ticket.url);
      else {
        const link = window.document.createElement('a');
        link.href = ticket.url;
        link.download = item.fileName;
        link.rel = 'noopener noreferrer';
        window.document.body.append(link);
        link.click();
        link.remove();
      }
    } catch (caught) {
      preview?.close();
      setError(caught instanceof ApiError ? caught.messageAr : 'Could not open the document.');
    }
  };

  const Icon = isImageMime(item.mimeType) ? ImageIcon : FileText;

  return (
    <li className="flex items-start gap-3 p-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-subtle">
        <Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="break-words text-sm font-medium text-ink">{item.title}</span>
          <Badge tone="neutral">{DOCUMENT_TYPE_AR[item.docType]}</Badge>
          {item.isExpired ? <Badge tone="danger">Expired</Badge> : null}
          {item.versionCount > 1 ? <Badge tone="info">{item.versionCount} versions</Badge> : null}
        </div>

        <p className="ltr-numerals truncate text-xs text-ink-subtle">
          {formatFileSize(item.sizeBytes)}
          {item.pageCount ? ` · ${item.pageCount}Page` : ''}
        </p>

        {item.expiryDate ? (
          <p className={cn('text-xs', item.isExpired ? 'text-danger' : 'text-ink-muted')}>
            Expires on {formatLongDateAr(new Date(item.expiryDate))}
          </p>
        ) : null}

        {item.caseNumber ? (
          <p className="ltr-numerals text-xs text-ink-subtle">{item.caseNumber}</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
        <Can permission="document:download">
          <button
            type="button"
            onClick={() => void open('inline')}
            aria-label={`View ${item.title}`}
            disabled={download.isPending}
            className="tap-target flex items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-brand hover:bg-surface-sunken"
          >
            <Eye className="size-4" aria-hidden />
            View
          </button>
          <button
            type="button"
            onClick={() => void open('attachment')}
            aria-label={`Download ${item.title}`}
            disabled={download.isPending}
            className="tap-target flex items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink-muted hover:bg-surface-sunken"
          >
            <Download className="size-4" aria-hidden />
            Download
          </button>
        </Can>
      </div>
    </li>
  );
}
