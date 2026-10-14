'use client';

import { Camera, ChevronDown, FileUp, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  ALLOWED_MIME_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_AR,
  formatFileSize,
  isAllowedMime,
  type AllowedMimeType,
  type DocumentType,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useUploadDocument } from '@/lib/api/documents';
import { buildPdfFromJpegs } from '@/lib/scan-to-pdf';
import { compressImage, UploadError, type UploadProgress } from '@/lib/upload';

type Mode = 'file' | 'scan';

/**
 * Upload a document, by file or by camera.
 *
 * The scan path exists because most Iraqi court paperwork arrives as paper. A
 * lawyer photographs three pages in the corridor and gets one PDF — capturing
 * three separate JPEGs would produce an archive nobody can use.
 */
export function DocumentUploadSheet({
  open,
  onOpenChange,
  caseId,
  transactionId,
  clientId,
  defaultDocType = 'COURT_DOCUMENT',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string;
  transactionId?: string;
  clientId?: string;
  defaultDocType?: DocumentType;
}) {
  const [mode, setMode] = useState<Mode>('file');
  /**
   * The file and its validated MIME type are stored together: the allow-list
   * check happens once, at pick time, and the narrowed type is carried from
   * there rather than re-asserted at submit.
   */
  const [file, setFile] = useState<{ blob: File; mimeType: AllowedMimeType } | null>(null);
  /**
   * Each page keeps its own object URL so previews are created once, not on
   * every render, and can be revoked when the page is removed or the sheet
   * closes. Creating them inline in JSX leaks one blob URL per render.
   */
  const [scanPages, setScanPages] = useState<Array<{ blob: Blob; url: string }>>([]);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocumentType>(defaultDocType);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [processingPage, setProcessingPage] = useState(false);
  const busyRef = useRef(false);
  const sessionRef = useRef(0);

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const upload = useUploadDocument();

  useEffect(() => {
    if (open) return;
    setMode('file');
    setFile(null);
    setScanPages((pages) => {
      for (const page of pages) URL.revokeObjectURL(page.url);
      return [];
    });
    setTitle('');
    setDocType(defaultDocType);
    setIssueDate('');
    setExpiryDate('');
    setNotes('');
    setProgress(null);
    setError(null);
    setShowMore(false);
    setProcessingPage(false);
    sessionRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, [open, defaultDocType]);

  const pickFile = (selected: File | undefined) => {
    if (!selected) return;
    setError(null);

    if (!isAllowedMime(selected.type)) {
      setError('Choose a PDF, image, Word or Excel file.');
      return;
    }
    if (selected.size === 0 || selected.size > 200 * 1024 * 1024) {
      setError(
        selected.size === 0
          ? 'The file is empty. Choose another copy.'
          : 'The file exceeds 200 MB. Choose a smaller file.',
      );
      return;
    }

    setFile({ blob: selected, mimeType: selected.type });
    // Pre-fill the title from the file name, minus the extension — right most
    // of the time, and always editable.
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, '').slice(0, 200));
  };

  const addScanPage = async (selected: File | undefined) => {
    if (!selected) return;
    setError(null);
    setProcessingPage(true);
    const session = sessionRef.current;

    try {
      const { blob } = await compressImage(selected);
      if (session !== sessionRef.current) return;
      setScanPages((pages) => [...pages, { blob, url: URL.createObjectURL(blob) }]);
    } catch {
      if (session === sessionRef.current)
        setError('Could not process the image. Try capturing it again.');
    } finally {
      setProcessingPage(false);
    }
  };

  const removeScanPage = (index: number) => {
    setScanPages((pages) => {
      const target = pages[index];
      if (target) URL.revokeObjectURL(target.url);
      return pages.filter((_, position) => position !== index);
    });
  };

  const submit = async () => {
    if (busyRef.current || processingPage) return;
    busyRef.current = true;
    setPreparing(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let payload: Blob;
      let fileName: string;
      let mimeType: AllowedMimeType;

      if (mode === 'scan') {
        if (scanPages.length === 0) {
          setError('Capture at least one page.');
          return;
        }
        payload = await buildPdfFromJpegs(scanPages.map((page) => page.blob));
        fileName = `${title || 'Scanned document'}.pdf`;
        mimeType = 'application/pdf';
      } else {
        if (!file) {
          setError('Choose a file first.');
          return;
        }
        payload = file.blob;
        fileName = file.blob.name;
        mimeType = file.mimeType;
      }

      if (controller.signal.aborted) throw new UploadError('Aborted', 'Upload cancelled.');
      await upload.mutateAsync({
        file: payload,
        fileName,
        mimeType,
        onProgress: setProgress,
        signal: controller.signal,
        metadata: {
          title: title.trim() || fileName,
          docType,
          caseId,
          transactionId,
          clientId,
          issueDate: issueDate || undefined,
          expiryDate: expiryDate || undefined,
          notes: notes || undefined,
        },
      });

      onOpenChange(false);
    } catch (caught) {
      if (caught instanceof UploadError) setError(caught.messageAr);
      else if (caught instanceof ApiError) {
        if (
          caught.fieldErrors.issueDate ||
          caught.fieldErrors.expiryDate ||
          caught.fieldErrors.notes
        )
          setShowMore(true);
        setError(Object.values(caught.fieldErrors).flat()[0] ?? caught.messageAr);
      } else setError('Could not upload the document. Try again.');
    } finally {
      setProgress(null);
      setPreparing(false);
      busyRef.current = false;
    }
  };

  const isUploading = upload.isPending || preparing;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Add document"
        description="Choose a file or scan the papers, then name the document and save it in this file."
      >
        <div className="space-y-4">
          <div className="flex gap-1 rounded-md bg-surface-sunken p-1">
            {(['file', 'scan'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                disabled={isUploading || processingPage}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-sm font-medium transition-colors',
                  mode === option ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted',
                )}
              >
                {option === 'file' ? <FileUp className="size-4" /> : <Camera className="size-4" />}
                {option === 'file' ? 'Upload file' : 'Scan document'}
              </button>
            ))}
          </div>

          {mode === 'file' ? (
            <div className="space-y-2">
              <input
                ref={fileInput}
                type="file"
                accept={ALLOWED_MIME_TYPES.join(',')}
                className="sr-only"
                onChange={(event) => pickFile(event.target.files?.[0])}
              />

              {file ? (
                <div className="flex items-center gap-3 rounded-md border border-line-strong p-3">
                  <FileUp className="size-5 shrink-0 text-ink-subtle" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{file.blob.name}</p>
                    <p className="ltr-numerals text-xs text-ink-subtle">
                      {formatFileSize(file.blob.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                    aria-label="Remove file"
                    className="tap-target flex items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-line-strong p-6 text-center transition-colors hover:bg-surface-sunken"
                >
                  <FileUp className="size-6 text-ink-subtle" aria-hidden />
                  <span className="text-sm font-medium text-ink">Choose a file</span>
                  <span className="text-xs text-ink-subtle">
                    PDF, image, Word or Excel, up to 200 MB
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                // `capture` opens the camera directly on mobile instead of the
                // gallery, which is the whole point of this path.
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  void addScanPage(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />

              {scanPages.length > 0 ? (
                <ul className="grid grid-cols-3 gap-2">
                  {scanPages.map((page, index) => (
                    <li key={page.url} className="relative">
                      {/* A private blob: URL, so keep optimisation disabled:
                          the preview stays entirely inside this browser. */}
                      <Image
                        src={page.url}
                        alt={`Page ${index + 1}`}
                        width={300}
                        height={400}
                        unoptimized
                        className="aspect-[3/4] w-full rounded-md border border-line object-cover"
                      />
                      <span className="ltr-numerals absolute start-1 top-1 rounded bg-scrim/80 px-1.5 text-xs text-white">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeScanPage(index)}
                        aria-label={`Delete page ${index + 1}`}
                        disabled={isUploading || processingPage}
                        className="absolute end-1 top-1 flex size-11 items-center justify-center rounded bg-scrim/80 text-white"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                block
                disabled={isUploading || processingPage}
                loading={processingPage}
                onClick={() => cameraInput.current?.click()}
              >
                <Camera className="size-4" />
                {scanPages.length === 0 ? 'Capture first page' : 'Add page'}
              </Button>

              {scanPages.length > 0 ? (
                <p className="text-center text-xs text-ink-subtle">
                  Merge {scanPages.length} pages into one PDF file.
                </p>
              ) : null}
              <p className="text-xs leading-6 text-ink-subtle">
                Capture each page clearly and in full. Pages are saved in the order captured in one
                file.
              </p>
            </div>
          )}

          <Field label="Document title" required>
            {(props) => (
              <Input
                {...props}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Certified power of attorney"
                disabled={isUploading}
                maxLength={200}
              />
            )}
          </Field>

          <Field label="Document type">
            {(props) => (
              <select
                {...props}
                value={docType}
                onChange={(event) => setDocType(event.target.value as DocumentType)}
                disabled={isUploading}
                className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
              >
                {DOCUMENT_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {DOCUMENT_TYPE_AR[option]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <button
            type="button"
            onClick={() => setShowMore((current) => !current)}
            aria-expanded={showMore}
            disabled={isUploading}
            className="flex min-h-11 w-full items-center gap-2 text-sm font-medium text-brand"
          >
            <ChevronDown aria-hidden className={showMore ? 'size-4 rotate-180' : 'size-4'} />
            Dates and notes (optional)
          </button>
          {showMore ? (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Issue date">
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={issueDate}
                      onChange={(event) => setIssueDate(event.target.value)}
                      disabled={isUploading}
                    />
                  )}
                </Field>
                <Field
                  label="Expiry date"
                  hint="Add an expiry date only if the document has one, to see an alert when it approaches."
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={expiryDate}
                      onChange={(event) => setExpiryDate(event.target.value)}
                      disabled={isUploading}
                    />
                  )}
                </Field>
              </div>

              <Field label="Notes">
                {(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    disabled={isUploading}
                  />
                )}
              </Field>
            </div>
          ) : null}

          {progress ? (
            <div className="space-y-1">
              <div
                role="progressbar"
                aria-label="Document upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                className="h-2 overflow-hidden rounded-full bg-surface-sunken"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width]"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="ltr-numerals text-center text-xs text-ink-subtle">
                {progress.percent}% — {formatFileSize(progress.loaded)} of{' '}
                {formatFileSize(progress.total)}
              </p>
            </div>
          ) : null}
          {isUploading && !progress ? (
            <p role="status" className="text-sm text-ink-muted">
              Preparing and saving the document…
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <SheetFooter>
            {isUploading ? (
              <Button variant="secondary" block onClick={() => abortRef.current?.abort()}>
                Cancel upload
              </Button>
            ) : (
              <Button variant="secondary" block onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button
              block
              loading={isUploading}
              disabled={
                !title.trim() ||
                processingPage ||
                (mode === 'file' ? !file : scanPages.length === 0)
              }
              onClick={() => void submit()}
            >
              Save document
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
