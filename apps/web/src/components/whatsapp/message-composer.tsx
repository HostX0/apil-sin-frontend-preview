'use client';

import { ClipboardList, Eye, MessageCircle, Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  WHATSAPP_ATTACHMENT_MIME_TYPES,
  WHATSAPP_MAX_ATTACHMENT_BYTES,
  createWhatsAppMessageSchema,
  formatFileSize,
  formatIraqiMobile,
  presignWhatsAppAttachmentSchema,
  type WhatsAppAttachment,
} from '@/lib/ui-shared';
import { Button, Card, Field, Sheet, SheetContent, SheetFooter, Textarea } from '@muhami/ui';
import { presignWhatsAppAttachment, useSendWhatsAppMessage } from '@/lib/api/whatsapp';
import { ApiError } from '@/lib/api-client';
import { useOnline } from '@/lib/offline';
import { UploadError, uploadToStorage, type UploadProgress } from '@/lib/upload';
import type { MessageRecipient } from './recipient-picker';

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function MessageComposer({
  recipient,
  configured,
  connected,
  onBusyChange,
}: {
  recipient: MessageRecipient | null;
  configured: boolean;
  connected: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const uploadedRef = useRef<{ file: File; attachment: WhatsAppAttachment } | null>(null);
  const requestRef = useRef<{ draft: string; requestId: string } | null>(null);
  const send = useSendWhatsAppMessage();
  const online = useOnline();

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const mimeType =
      candidate.type || MIME_BY_EXTENSION[candidate.name.split('.').pop()?.toLowerCase() ?? ''];
    const parsed = presignWhatsAppAttachmentSchema.safeParse({
      fileName: candidate.name,
      mimeType,
      sizeBytes: candidate.size,
    });
    setNotice(null);
    if (!parsed.success) {
      setError(
        candidate.size > WHATSAPP_MAX_ATTACHMENT_BYTES
          ? 'Attachments must be no larger than 10 MB.'
          : 'Choose a PDF, JPG/PNG image or Word document.',
      );
      return;
    }
    setError(null);
    setFile(candidate);
    uploadedRef.current = null;
  };

  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipient?.phone || !configured || submitting) return;
    setError(null);
    setNotice(null);
    if (!body.trim() && !file) {
      setError('Enter a message or choose an attachment.');
      return;
    }
    if (file && !online && uploadedRef.current?.file !== file) {
      setError('Connect to the internet to upload the attachment before sending.');
      return;
    }

    setReviewOpen(true);
  };

  const submit = async () => {
    if (!recipient?.phone || !configured || submitting || !reviewOpen) return;
    setError(null);
    setNotice(null);

    setSubmitting(true);
    onBusyChange(true);
    abortRef.current = new AbortController();
    try {
      let attachment: WhatsAppAttachment | undefined;
      if (file) {
        if (uploadedRef.current?.file === file) {
          attachment = uploadedRef.current.attachment;
        } else {
          const mimeType =
            file.type || MIME_BY_EXTENSION[file.name.split('.').pop()?.toLowerCase() ?? ''];
          const metadata = presignWhatsAppAttachmentSchema.parse({
            fileName: file.name,
            mimeType,
            sizeBytes: file.size,
          });
          const ticket = await presignWhatsAppAttachment(metadata);
          const contentType =
            Object.entries(ticket.headers).find(
              ([name]) => name.toLowerCase() === 'content-type',
            )?.[1] ?? metadata.mimeType;
          await uploadToStorage(
            { uploadUrl: ticket.uploadUrl, requiredContentType: contentType },
            file,
            {
              signal: abortRef.current.signal,
              onProgress: setProgress,
              headers: ticket.headers,
            },
          );
          attachment = { ...metadata, objectKey: ticket.objectKey };
          uploadedRef.current = { file, attachment };
        }
      }
      const draft = JSON.stringify([
        recipient.type,
        recipient.id,
        body.trim(),
        file ? [file.name, file.size, file.lastModified] : null,
        attachment?.objectKey ?? null,
      ]);
      if (requestRef.current?.draft !== draft) {
        requestRef.current = { draft, requestId: crypto.randomUUID() };
      }
      const input = createWhatsAppMessageSchema.parse({
        recipientType: recipient.type,
        recipientId: recipient.id,
        body,
        requestId: requestRef.current.requestId,
        attachment,
      });
      const result = await send.mutateAsync({ ...input, recipientName: recipient.name });
      setBody('');
      setFile(null);
      uploadedRef.current = null;
      requestRef.current = null;
      setReviewOpen(false);
      if (inputRef.current) inputRef.current.value = '';
      setNotice(
        result.queued
          ? 'Message saved on this device to send when you reconnect. Track it in pending changes.'
          : connected
            ? `Message saved for ${recipient.name} to send. Track delivery in the message history below.`
            : `Message saved for ${recipient.name} while the office number is disconnected. It will be sent when the number reconnects.`,
      );
    } catch (caught) {
      if (caught instanceof ApiError || caught instanceof UploadError) setError(caught.messageAr);
      else
        setError(
          'Could not save the message. Your text and attachment are kept so you can try again.',
        );
    } finally {
      setProgress(null);
      setSubmitting(false);
      onBusyChange(false);
      abortRef.current = null;
    }
  };

  const preset = (kind: 'task' | 'followup') => {
    const name = recipient?.name || 'Lawyer';
    setBody(
      kind === 'task'
        ? `Dear ${name}, please follow up on the task below:

Task:
Case or transaction:
Due date:

Please notify the office when complete.`
        : `Dear ${name}, please send the office the latest case or transaction update:

File:
Latest action:
Next step:
Required date:`,
    );
    setError(null);
    setNotice(null);
  };

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm text-brand"
            aria-hidden
          >
            2
          </span>
          Write the message and attach a file
        </h2>
        <p className="mt-1 text-xs leading-6 text-ink-muted">
          A text message, court notice or one document with an optional description.
        </p>
      </div>
      {recipient ? (
        <div className="rounded-xl border border-brand/20 bg-brand-subtle px-3 py-2.5">
          <p className="text-sm font-semibold text-brand">To {recipient.name}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {recipient.phone ? (
              <span dir="ltr">{formatIraqiMobile(recipient.phone)}</span>
            ) : (
              'Add the lawyer’s mobile number before sending.'
            )}
          </p>
        </div>
      ) : (
        <p className="rounded-xl bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
          Choose a client or lawyer from the list first.
        </p>
      )}
      {configured && !connected ? (
        <p className="rounded-xl bg-warning-subtle px-3 py-2.5 text-xs leading-6 text-warning">
          The office number is disconnected. Messages stay queued until it is linked in Office
          number.
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={review}>
        {recipient?.type === 'lawyer' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={submitting}
              onClick={() => preset('task')}
            >
              <ClipboardList className="size-4" aria-hidden />
              Task template
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={submitting}
              onClick={() => preset('followup')}
            >
              <MessageCircle className="size-4" aria-hidden />
              Follow-up template
            </Button>
          </div>
        ) : null}
        <Field
          label="Message text"
          hint="Up to 2,000 characters. Optional when attaching a document."
        >
          {(props) => (
            <Textarea
              {...props}
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              disabled={submitting || !configured}
              placeholder="Write your message or follow-up details..."
            />
          )}
        </Field>
        <p className="text-end text-xs text-ink-subtle" dir="ltr">
          {body.length} / 2000
        </p>
        <input
          ref={inputRef}
          type="file"
          aria-label="Attach a document on WhatsApp"
          className="sr-only"
          disabled={submitting || !configured}
          accept={`${WHATSAPP_ATTACHMENT_MIME_TYPES.join(',')},.pdf,.jpg,.jpeg,.png,.doc,.docx`}
          onChange={(event) => {
            pickFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {file ? (
          <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            <Paperclip className="size-5 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
              <p className="text-xs text-ink-subtle">{formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              disabled={submitting}
              aria-label="Remove attachment"
              className="tap-target flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken"
              onClick={() => {
                setFile(null);
                uploadedRef.current = null;
              }}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={submitting || !configured}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="size-4" aria-hidden />
            {file ? 'Replace attachment' : 'Attach document'}
          </Button>
          <span className="text-xs text-ink-subtle">PDF, images or Word · up to 10 MB</span>
        </div>
        {progress ? (
          <div className="space-y-1">
            <progress
              className="h-2 w-full accent-brand"
              value={progress.loaded}
              max={progress.total}
              aria-label="Attachment upload progress"
            />
            <p className="text-xs text-ink-muted">Uploading attachment: {progress.percent}%</p>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl bg-danger-subtle px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="rounded-xl bg-success-subtle px-3 py-2.5 text-sm leading-7 text-success"
          >
            {notice}
          </p>
        ) : null}
        <Button
          type="submit"
          block
          loading={submitting}
          disabled={!configured || !recipient?.phone || (!body.trim() && !file)}
        >
          <Eye className="size-4" aria-hidden />
          Review message
        </Button>
      </form>
      <Sheet
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!submitting) setReviewOpen(open);
        }}
      >
        <SheetContent
          title="3 · Review and send"
          description="Check the recipient and attachment before sending."
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-subtle p-3">
              <p className="text-xs text-ink-muted">Recipient</p>
              <p className="mt-1 font-semibold text-brand">{recipient?.name}</p>
              <p className="mt-1 text-sm text-ink-muted" dir="ltr">
                {recipient?.phone ? formatIraqiMobile(recipient.phone) : ''}
              </p>
            </div>
            {body.trim() ? (
              <p className="whitespace-pre-wrap break-words rounded-xl border border-line p-3 text-sm leading-7 text-ink">
                {body.trim()}
              </p>
            ) : (
              <p className="text-sm text-ink-muted">
                The attachment will be sent without a text message.
              </p>
            )}
            {file ? (
              <div className="flex items-start gap-2 rounded-xl bg-surface-sunken p-3">
                <Paperclip className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-ink">{file.name}</p>
                  <p className="mt-1 text-xs text-ink-muted">{formatFileSize(file.size)}</p>
                  {filePreviewUrl ? (
                    <a
                      href={filePreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4"
                    >
                      Open attachment to review
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
            {!online || !connected ? (
              <p className="rounded-xl bg-warning-subtle p-3 text-sm leading-7 text-warning">
                {!online
                  ? 'You are offline. The message is saved on this device and sent when you reconnect and the office number is linked.'
                  : 'The office number is disconnected. The message is saved now and sent automatically when the number is linked.'}
              </p>
            ) : null}
            {progress ? (
              <div role="status" className="space-y-1">
                <progress
                  className="h-2 w-full accent-brand"
                  value={progress.loaded}
                  max={progress.total}
                  aria-label="Attachment upload progress"
                />
                <p className="text-xs text-ink-muted">Uploading attachment: {progress.percent}%</p>
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm leading-7 text-danger">
                {error}
              </p>
            ) : null}
            <SheetFooter>
              <Button
                type="button"
                variant="secondary"
                block
                disabled={submitting}
                onClick={() => setReviewOpen(false)}
              >
                Edit message
              </Button>
              <Button type="button" block loading={submitting} onClick={() => void submit()}>
                <Send className="size-4" aria-hidden />
                {!online
                  ? 'Save until reconnected'
                  : !connected
                    ? 'Save until number is linked'
                    : 'Send message'}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
