'use client';

import { Bell, Check, ImagePlus, MessageCircle, RefreshCw, Save, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  WHATSAPP_AUTOMATION_DEFINITIONS,
  WHATSAPP_VARIABLE_LABELS,
  WHATSAPP_AUTOMATION_EVENTS,
  WHATSAPP_DEFAULT_WELCOME_IMAGE_ID,
  WHATSAPP_MAX_ATTACHMENT_BYTES,
  WHATSAPP_WELCOME_IMAGES,
  formatFileSize,
  presignWhatsAppWelcomeImageSchema,
  type WhatsAppAutomationEvent,
  type WhatsAppAutomationTemplate,
  type WhatsAppWelcomeUpload,
} from '@/lib/ui-shared';
import { Badge, Button, Card, ErrorState, Field, Skeleton, Textarea, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { getWhatsAppWelcomeImagePreview, presignWhatsAppWelcomeImage } from '@/lib/api/whatsapp';
import { UploadError, uploadToStorage, type UploadProgress } from '@/lib/upload';
import {
  isWelcomeImageEnabled,
  shouldUploadWelcomeImage,
  welcomeImageSelection,
  type WelcomeImageChoice,
} from '@/lib/welcome-image-selection';
import { automaticMessagePreview } from '@/lib/whatsapp-template-preview';

// The event itself decides the recipient; this screen never asks an office to
// configure recipient IDs, providers, or routing rules.
export function AutomaticMessages({
  templates,
  loading,
  error,
  configured,
  connected,
  saving,
  retry,
  save,
  reload,
}: {
  templates: WhatsAppAutomationTemplate[] | undefined;
  loading: boolean;
  error: unknown;
  configured: boolean;
  connected: boolean;
  saving: boolean;
  retry: () => void;
  save: (template: WhatsAppAutomationTemplate) => Promise<WhatsAppAutomationTemplate>;
  reload: (eventKey: WhatsAppAutomationEvent) => Promise<WhatsAppAutomationTemplate | undefined>;
}) {
  const [selectedEvent, setSelectedEvent] = useState<WhatsAppAutomationEvent>('client.created');
  const selectionId = useId();

  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Bell className="size-5 text-brand" aria-hidden />
          Automatic messages
        </h2>
        <p className="text-sm leading-7 text-ink-muted">
          Choose an event, write the message, enable it and save. The system selects the recipient
          and sends from the office number automatically.
        </p>
        <p className="text-sm leading-7 text-ink-muted">
          Saving a template does not send it now. It sends when the selected event occurs after
          activation.
        </p>
        {!configured ? (
          <p
            role="status"
            className="rounded-xl bg-warning-subtle px-3 py-2.5 text-sm leading-7 text-warning"
          >
            You can prepare templates now. Messages begin after WhatsApp setup is complete and the
            office number is linked.
          </p>
        ) : !connected ? (
          <p
            role="status"
            className="rounded-xl bg-warning-subtle px-3 py-2.5 text-sm leading-7 text-warning"
          >
            The number is currently disconnected. Messages are saved and queued until it is linked
            in Office number.
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-success-subtle px-3 py-2.5 text-sm leading-7 text-success">
            <Check className="mt-1 size-4 shrink-0" aria-hidden />
            The number is connected. Active templates use it automatically. Follow delivery in
            message history.
          </p>
        )}
      </Card>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2" aria-label="Loading message templates">
          {WHATSAPP_AUTOMATION_EVENTS.map((eventKey) => (
            <Skeleton key={eventKey} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load automatic messages"
          description={error instanceof ApiError ? error.messageAr : undefined}
          onRetry={retry}
        />
      ) : (
        <div className="space-y-4">
          <Card className="space-y-2 p-4 sm:p-5">
            <label htmlFor={selectionId} className="block text-sm font-semibold text-ink">
              1 · When should the message be sent?
            </label>
            <select
              id={selectionId}
              value={selectedEvent}
              disabled={saving}
              onChange={(change) =>
                setSelectedEvent(change.target.value as WhatsAppAutomationEvent)
              }
              className="min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink"
            >
              {WHATSAPP_AUTOMATION_EVENTS.map((eventKey) => (
                <option key={eventKey} value={eventKey}>
                  {WHATSAPP_AUTOMATION_DEFINITIONS[eventKey].title} ·{' '}
                  {templates?.find((item) => item.eventKey === eventKey)?.enabled
                    ? 'Enabled'
                    : 'Disabled'}
                </option>
              ))}
            </select>
          </Card>
          {WHATSAPP_AUTOMATION_EVENTS.map((eventKey) => {
            const template = templates?.find((item) => item.eventKey === eventKey);
            return template ? (
              <div key={eventKey} hidden={eventKey !== selectedEvent}>
                <AutomaticMessageCard template={template} save={save} reload={reload} />
              </div>
            ) : null;
          })}
          <details className="rounded-xl border border-line p-3 text-sm leading-7 text-ink-muted">
            <summary className="cursor-pointer font-medium text-ink">
              What happens when a message is edited or disabled?
            </summary>
            <p className="mt-2">
              Edits apply to future events. Disabling stops new messages and cancels messages not
              yet sent. Sent messages remain in history.
            </p>
          </details>
        </div>
      )}
    </div>
  );
}

function AutomaticMessageCard({
  template,
  save,
  reload,
}: {
  template: WhatsAppAutomationTemplate;
  save: (template: WhatsAppAutomationTemplate) => Promise<WhatsAppAutomationTemplate>;
  reload: (eventKey: WhatsAppAutomationEvent) => Promise<WhatsAppAutomationTemplate | undefined>;
}) {
  const event = WHATSAPP_AUTOMATION_DEFINITIONS[template.eventKey];
  const [baseline, setBaseline] = useState(template);
  const [body, setBody] = useState(template.body);
  const [enabled, setEnabled] = useState(template.enabled);
  const [attachImage, setAttachImage] = useState(isWelcomeImageEnabled(template));
  const [imageChoice, setImageChoice] = useState<WelcomeImageChoice>(
    template.welcomeUpload
      ? 'custom'
      : (template.welcomeImageId ?? WHATSAPP_DEFAULT_WELCOME_IMAGE_ID),
  );
  const [welcomeUpload, setWelcomeUpload] = useState(template.welcomeUpload ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [savedPreview, setSavedPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const uploadedRef = useRef<{ file: File; upload: WhatsAppWelcomeUpload } | null>(null);
  const [pending, setPending] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const switchId = useId();
  const hintId = useId();
  const headingId = useId();
  const imageSwitchId = useId();
  const imageHintId = useId();
  const imageChoiceId = useId();
  const fileInputId = useId();
  const uploadHintId = useId();
  const selection = welcomeImageSelection(
    template.eventKey,
    attachImage,
    imageChoice,
    welcomeUpload,
    baseline,
  );
  const welcomeImage = attachImage
    ? WHATSAPP_WELCOME_IMAGES.find((image) => image.id === selection.welcomeImageId)
    : undefined;
  const customPreview =
    attachImage && imageChoice === 'custom' ? (localPreview ?? savedPreview) : null;
  const changed =
    body !== baseline.body ||
    enabled !== baseline.enabled ||
    selection.welcomeImageEnabled !== isWelcomeImageEnabled(baseline) ||
    selection.welcomeImageId !== baseline.welcomeImageId ||
    selection.welcomeUpload?.objectKey !== baseline.welcomeUpload?.objectKey ||
    (attachImage && imageChoice === 'custom' && file !== null);
  const newerVersion = template.version > baseline.version;

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!file) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setSavedPreview(null);
    setPreviewError(false);
    if (!attachImage || imageChoice !== 'custom' || file || !welcomeUpload) {
      setPreviewLoading(false);
      return;
    }
    // A signed URL represents the currently saved image only. Unsaved local
    // candidates use their blob preview and never leave this browser on selection.
    if (welcomeUpload.objectKey !== baseline.welcomeUpload?.objectKey) {
      setPreviewLoading(false);
      return;
    }
    const controller = new AbortController();
    setPreviewLoading(true);
    void getWhatsAppWelcomeImagePreview(controller.signal)
      .then((preview) => {
        if (!controller.signal.aborted) setSavedPreview(preview.url);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreviewError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });
    return () => controller.abort();
  }, [
    attachImage,
    imageChoice,
    file,
    welcomeUpload,
    baseline.welcomeUpload?.objectKey,
    previewAttempt,
  ]);

  // Background refreshes can update a clean card. They must never overwrite an
  // administrator's unfinished text, including after a version conflict.
  useEffect(() => {
    if (!newerVersion || changed || conflict) return;
    setBaseline(template);
    setBody(template.body);
    setEnabled(template.enabled);
    setAttachImage(isWelcomeImageEnabled(template));
    setImageChoice(
      template.welcomeUpload
        ? 'custom'
        : (template.welcomeImageId ?? WHATSAPP_DEFAULT_WELCOME_IMAGE_ID),
    );
    setWelcomeUpload(template.welcomeUpload ?? null);
    setFile(null);
    uploadedRef.current = null;
  }, [template, newerVersion, changed, conflict]);

  const resetToLatest = async () => {
    setReloading(true);
    setError(null);
    try {
      const latest = await reload(template.eventKey);
      if (!latest) throw new Error('Template missing');
      setBaseline(latest);
      setBody(latest.body);
      setEnabled(latest.enabled);
      setAttachImage(isWelcomeImageEnabled(latest));
      setImageChoice(
        latest.welcomeUpload
          ? 'custom'
          : (latest.welcomeImageId ?? WHATSAPP_DEFAULT_WELCOME_IMAGE_ID),
      );
      setWelcomeUpload(latest.welcomeUpload ?? null);
      setFile(null);
      uploadedRef.current = null;
      setImageError(null);
      if (fileInput.current) fileInput.current.value = '';
      setConflict(false);
      setSaved(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.messageAr
          : 'Could not load the latest version. Try again.',
      );
    } finally {
      setReloading(false);
    }
  };

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const extension = candidate.name.split('.').pop()?.toLowerCase();
    const mimeType =
      candidate.type ||
      (extension === 'png'
        ? 'image/png'
        : ['jpg', 'jpeg'].includes(extension ?? '')
          ? 'image/jpeg'
          : '');
    const parsed = presignWhatsAppWelcomeImageSchema.safeParse({
      fileName: candidate.name,
      mimeType,
      sizeBytes: candidate.size,
    });
    setSaved(false);
    if (!parsed.success) {
      setImageError(
        candidate.size > WHATSAPP_MAX_ATTACHMENT_BYTES
          ? 'The image is too large. Choose an image up to 10 MB.'
          : 'Choose a valid JPG or PNG image up to 10 MB.',
      );
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setFile(candidate);
    setImageChoice('custom');
    setImageError(null);
    setError(null);
    uploadedRef.current = null;
  };

  const removeCustomImage = () => {
    setFile(null);
    setWelcomeUpload(null);
    setSavedPreview(null);
    setImageError(null);
    setSaved(false);
    uploadedRef.current = null;
    if (fileInput.current) fileInput.current.value = '';
  };

  const insertVariable = (variable: string) => {
    const field = textarea.current;
    const start = field?.selectionStart ?? body.length;
    const end = field?.selectionEnd ?? start;
    const token = `{${variable}}`;
    setBody(`${body.slice(0, start)}${token}${body.slice(end)}`);
    setSaved(false);
    setError(null);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = async (submission: FormEvent<HTMLFormElement>) => {
    submission.preventDefault();
    if (pending || reloading || !changed) return;
    const cleaned = body.trim();
    const unsupported = Array.from(cleaned.matchAll(/\{([^{}]+)\}/g))
      .map((match) => match[1]!)
      .find((variable) => !event.variables.some((allowed) => allowed === variable));
    setError(null);
    setSaved(false);
    if (!cleaned) {
      setError('Enter the message text before saving.');
      textarea.current?.focus();
      return;
    }
    if (cleaned.length > 2000) {
      setError('The message exceeds 2,000 characters. Shorten it before saving.');
      return;
    }
    if (unsupported) {
      setError(
        `Field {${unsupported}} is not available for this event. Use the buttons below the text.`,
      );
      return;
    }
    if (attachImage && imageChoice === 'custom' && !file && !welcomeUpload) {
      setImageError('Choose your image first, or choose one of the three designs.');
      fileInput.current?.focus();
      return;
    }
    setPending(true);
    setImageError(null);
    abortRef.current = new AbortController();
    try {
      let upload = welcomeUpload;
      if (
        shouldUploadWelcomeImage(template.eventKey, attachImage, imageChoice, file !== null) &&
        file
      ) {
        if (uploadedRef.current?.file === file) {
          upload = uploadedRef.current.upload;
        } else {
          const extension = file.name.split('.').pop()?.toLowerCase();
          const metadata = presignWhatsAppWelcomeImageSchema.parse({
            fileName: file.name,
            mimeType: file.type || (extension === 'png' ? 'image/png' : 'image/jpeg'),
            sizeBytes: file.size,
          });
          const ticket = await presignWhatsAppWelcomeImage(metadata, abortRef.current.signal);
          if (abortRef.current.signal.aborted) return;
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
          if (abortRef.current.signal.aborted) return;
          upload = { ...metadata, objectKey: ticket.objectKey };
          uploadedRef.current = { file, upload };
        }
      }
      const result = await save({
        ...baseline,
        enabled,
        body: cleaned,
        ...welcomeImageSelection(template.eventKey, attachImage, imageChoice, upload, baseline),
      });
      setBaseline(result);
      setBody(result.body);
      setEnabled(result.enabled);
      setAttachImage(isWelcomeImageEnabled(result));
      setImageChoice(
        result.welcomeUpload
          ? 'custom'
          : (result.welcomeImageId ?? WHATSAPP_DEFAULT_WELCOME_IMAGE_ID),
      );
      setWelcomeUpload(result.welcomeUpload ?? null);
      // Only a successful save discards a staged replacement. Paused templates
      // restore their retained saved image, ready for the next enable action.
      setFile(null);
      uploadedRef.current = null;
      if (fileInput.current) fileInput.current.value = '';
      setConflict(false);
      setSaved(true);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setConflict(caught.code === 'VERSION_CONFLICT');
        setError(caught.code === 'VERSION_CONFLICT' ? null : caught.messageAr);
      } else if (caught instanceof UploadError) {
        setImageError(`${caught.messageAr} Select Save to try again.`);
      } else {
        setError('Could not save the template. Your text is kept so you can try again.');
      }
    } finally {
      setProgress(null);
      setPending(false);
      abortRef.current = null;
    }
  };

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <form
        className="space-y-4"
        aria-labelledby={headingId}
        onSubmit={(submission) => void submit(submission)}
        noValidate
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 id={headingId} className="text-base font-semibold text-ink">
              {event.title}
            </h3>
            <p className="mt-1 text-sm leading-7 text-ink-muted">{event.description}</p>
          </div>
          <Badge tone={baseline.enabled ? 'success' : 'neutral'}>
            {baseline.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        <p className="flex items-start gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm leading-7 text-ink-muted">
          <MessageCircle className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            {event.recipientType === 'lawyer'
              ? 'Sent to the newly added lawyer using the mobile number in their file.'
              : template.eventKey === 'client.created'
                ? 'Sent to the new client using the mobile number in their file.'
                : 'Sent to the client linked to the case or transaction using their saved mobile number.'}
          </span>
        </p>

        <Field label="2 · Write the message" required error={error ?? undefined}>
          {(props) => (
            <Textarea
              {...props}
              ref={textarea}
              value={body}
              rows={4}
              maxLength={2000}
              disabled={pending || reloading}
              placeholder="Enter the message you want to send..."
              onChange={(change) => {
                setBody(change.target.value);
                setSaved(false);
                setError(null);
              }}
            />
          )}
        </Field>

        <div className="space-y-2">
          <p className="text-xs leading-6 text-ink-muted">
            Insert a name or file number automatically by choosing a field:
          </p>
          <div className="flex flex-wrap gap-2">
            {event.variables.map((variable) => (
              <Button
                key={variable}
                type="button"
                variant="secondary"
                disabled={pending || reloading}
                className="min-h-11 max-w-full whitespace-normal px-3 text-xs"
                onClick={() => insertVariable(variable)}
              >
                {WHATSAPP_VARIABLE_LABELS[variable]}
              </Button>
            ))}
          </div>
        </div>

        {template.eventKey === 'client.created' ? (
          <div className="space-y-3 rounded-xl border border-line p-3">
            <label
              htmlFor={imageSwitchId}
              className="flex min-h-11 cursor-pointer items-center justify-between gap-3"
            >
              <span className="text-sm font-semibold text-ink">3 · Attach a welcome image</span>
              <input
                id={imageSwitchId}
                type="checkbox"
                role="switch"
                checked={attachImage}
                aria-checked={attachImage}
                aria-describedby={imageHintId}
                disabled={pending || reloading}
                onChange={(change) => {
                  setAttachImage(change.target.checked);
                  setSaved(false);
                  setError(null);
                  setImageError(null);
                }}
                className="size-5 shrink-0 accent-brand"
              />
            </label>
            <p id={imageHintId} className="text-xs leading-6 text-ink-muted">
              {attachImage
                ? 'Save the image once. It is attached automatically to every new client welcome. You can omit it for an individual client.'
                : baseline.welcomeImageId || baseline.welcomeUpload
                  ? 'Send the welcome text only. The image remains saved and is reused when you enable this option again.'
                  : 'No image: only the welcome text is sent.'}
            </p>
            {attachImage ? (
              <fieldset disabled={pending || reloading} className="space-y-3">
                <legend className="mb-2 text-xs font-medium text-ink">
                  Choose a design or upload your image
                </legend>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {WHATSAPP_WELCOME_IMAGES.map((image) => (
                    <label
                      key={image.id}
                      className={cn(
                        'min-w-0 cursor-pointer overflow-hidden rounded-lg border-2 bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand',
                        image.id === imageChoice ? 'border-brand' : 'border-line',
                      )}
                    >
                      <Image
                        src={image.src}
                        alt={`DevsHub welcome image — ${image.label}`}
                        width={400}
                        height={400}
                        sizes="(max-width: 640px) 30vw, 180px"
                        unoptimized
                        className="aspect-square w-full object-contain"
                      />
                      <span className="flex min-h-11 items-center gap-1.5 p-2 text-xs font-medium leading-5 text-ink">
                        <input
                          type="radio"
                          name={imageChoiceId}
                          value={image.id}
                          checked={image.id === imageChoice}
                          onChange={() => {
                            setImageChoice(image.id);
                            setSaved(false);
                            setError(null);
                            setImageError(null);
                          }}
                          className="size-4 shrink-0 accent-brand"
                        />
                        {image.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div
                  className={cn(
                    'space-y-3 rounded-lg border-2 p-3',
                    imageChoice === 'custom'
                      ? 'border-brand bg-brand-subtle/30'
                      : 'border-line bg-surface',
                  )}
                >
                  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
                    <input
                      type="radio"
                      name={imageChoiceId}
                      value="custom"
                      checked={imageChoice === 'custom'}
                      onChange={() => {
                        setImageChoice('custom');
                        setSaved(false);
                        setError(null);
                        setImageError(null);
                      }}
                      className="size-4 shrink-0 accent-brand"
                    />
                    <ImagePlus className="size-5 shrink-0 text-brand" aria-hidden />
                    My custom image
                  </label>
                  {imageChoice === 'custom' ? (
                    <div className="space-y-3 border-t border-line pt-3">
                      <p id={uploadHintId} className="text-xs leading-6 text-ink-muted">
                        JPG or PNG, up to 10 MB. Upload once and press Save to use it for every new
                        client.
                      </p>
                      <input
                        ref={fileInput}
                        id={fileInputId}
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        aria-label="Choose custom welcome image"
                        aria-describedby={uploadHintId}
                        aria-invalid={Boolean(imageError)}
                        onChange={(change) => pickFile(change.target.files?.[0])}
                        className="sr-only"
                      />
                      {file || welcomeUpload ? (
                        <div className="min-w-0 rounded-lg bg-surface-sunken px-3 py-2">
                          <p dir="auto" className="break-words text-sm font-medium text-ink">
                            {file?.name ?? welcomeUpload?.fileName}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-ink-muted">
                            {formatFileSize(file?.size ?? welcomeUpload?.sizeBytes ?? 0)} ·{' '}
                            {file ? 'Ready to upload on Save' : 'Saved image'}
                          </p>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => fileInput.current?.click()}
                        >
                          <ImagePlus className="size-4" aria-hidden />
                          {file || welcomeUpload ? 'Replace image' : 'Choose image from device'}
                        </Button>
                        {file || welcomeUpload ? (
                          <Button type="button" variant="ghost" onClick={removeCustomImage}>
                            <X className="size-4" aria-hidden />
                            Remove image
                          </Button>
                        ) : null}
                      </div>
                      {progress ? (
                        <div role="status" className="space-y-1.5">
                          <p className="text-xs leading-6 text-brand">
                            Uploading image… {progress.percent}%
                          </p>
                          <progress
                            aria-label="Welcome image upload progress"
                            value={progress.percent}
                            max={100}
                            className="h-2 w-full accent-brand"
                          />
                        </div>
                      ) : pending && file ? (
                        <p role="status" className="text-xs leading-6 text-brand">
                          Preparing image and saving template…
                        </p>
                      ) : null}
                      {imageError ? (
                        <p role="alert" className="text-xs leading-6 text-danger">
                          {imageError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </fieldset>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 rounded-xl border border-brand/15 bg-brand-subtle/40 p-3">
          <p className="text-xs font-semibold text-brand">Preview with sample details</p>
          {welcomeImage ? (
            <Image
              src={welcomeImage.src}
              alt={`Attached welcome image — ${welcomeImage.label}`}
              width={240}
              height={240}
              unoptimized
              className="mx-auto aspect-square w-full max-w-60 rounded-lg object-contain"
            />
          ) : null}
          {customPreview ? (
            <Image
              src={customPreview}
              alt="Custom image attached to the welcome message"
              width={240}
              height={240}
              unoptimized
              onError={() => {
                if (localPreview)
                  setImageError('Could not display the image. Choose a valid JPG or PNG image.');
                else {
                  setSavedPreview(null);
                  setPreviewError(true);
                }
              }}
              className="mx-auto max-h-72 w-full max-w-60 rounded-lg object-contain"
            />
          ) : attachImage && imageChoice === 'custom' && previewLoading ? (
            <p role="status" className="text-xs leading-6 text-ink-muted">
              Loading saved image preview…
            </p>
          ) : null}
          {attachImage && imageChoice === 'custom' && !file && previewError ? (
            <div className="flex flex-wrap items-center gap-2">
              <p role="status" className="text-xs leading-6 text-ink-muted">
                Could not display the saved image preview.
              </p>
              <Button
                type="button"
                variant="ghost"
                disabled={pending || reloading}
                onClick={() => setPreviewAttempt((attempt) => attempt + 1)}
              >
                <RefreshCw className="size-4" aria-hidden />
                Reload preview
              </Button>
            </div>
          ) : null}
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">
            {body.trim()
              ? automaticMessagePreview(body)
              : 'The message text appears here as you type.'}
          </p>
        </div>

        <label
          htmlFor={switchId}
          className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
        >
          <span className="text-sm font-semibold text-ink">
            {template.eventKey === 'client.created' ? '4' : '3'} · Enable automatic sending for this
            message
          </span>
          <input
            id={switchId}
            type="checkbox"
            role="switch"
            aria-label={`Automatic sending — ${event.title}`}
            aria-checked={enabled}
            aria-describedby={hintId}
            checked={enabled}
            disabled={pending || reloading}
            onChange={(change) => {
              setEnabled(change.target.checked);
              setSaved(false);
            }}
            className="size-5 shrink-0 accent-brand"
          />
        </label>
        <p id={hintId} className="text-xs leading-6 text-ink-subtle">
          Press Save to apply the message
          {template.eventKey === 'client.created' ? ' and image' : ''} and activation status.
        </p>

        {conflict || newerVersion ? (
          <div
            role="alert"
            className="space-y-2 rounded-xl bg-warning-subtle p-3 text-sm leading-7 text-warning"
          >
            <p>
              Another user changed this template. Your text is kept; copy it if you want to keep it,
              then load the latest version before saving.
            </p>
            <Button
              type="button"
              variant="secondary"
              loading={reloading}
              disabled={pending}
              onClick={() => void resetToLatest()}
            >
              Load latest version
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            loading={pending}
            disabled={!changed || reloading || conflict || newerVersion}
          >
            <Save className="size-4" aria-hidden />
            Save
          </Button>
          <p
            role="status"
            className={cn('text-xs leading-6', saved ? 'text-success' : 'text-ink-muted')}
          >
            {saved
              ? baseline.enabled
                ? 'Message saved and automatic sending enabled.'
                : 'Template saved and automatic sending disabled.'
              : changed
                ? 'You have changes to save.'
                : 'Template saved.'}
          </p>
        </div>
      </form>
    </Card>
  );
}
