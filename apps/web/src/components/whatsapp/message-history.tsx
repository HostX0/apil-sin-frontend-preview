'use client';

import { MessageCircle, Paperclip, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  APP_TIMEZONE,
  WHATSAPP_MESSAGE_STATUS_AR,
  WHATSAPP_AUTOMATION_DEFINITIONS,
  WHATSAPP_WELCOME_IMAGES,
  formatIraqiMobile,
  type ListWhatsAppMessagesQuery,
  type WhatsAppMessageStatus,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, type BadgeProps } from '@muhami/ui';
import { useWhatsAppMessages } from '@/lib/api/whatsapp';
import { ApiError } from '@/lib/api-client';
import { usePageVisible } from './use-page-visible';

const STATUS_TONE: Record<WhatsAppMessageStatus, BadgeProps['tone']> = {
  queued: 'neutral',
  in_flight: 'info',
  accepted: 'info',
  delivered: 'success',
  read: 'success',
  failed: 'danger',
  uncertain: 'warning',
  expired: 'warning',
  cancelled: 'neutral',
  skipped: 'neutral',
};
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function MessageHistory({
  filters,
  active = true,
}: {
  filters: ListWhatsAppMessagesQuery;
  active?: boolean;
}) {
  const visible = usePageVisible();
  const query = useWhatsAppMessages(filters, visible && active);
  const [visibleCount, setVisibleCount] = useState(10);
  useEffect(() => setVisibleCount(10), [filters.recipientType, filters.recipientId]);

  return (
    <section className="space-y-3" aria-labelledby="whatsapp-history-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="whatsapp-history-title" className="text-base font-semibold text-ink">
            Message history
          </h2>
          <p className="mt-1 text-xs text-ink-subtle">
            Follow delivery of messages for{' '}
            {filters.recipientId ? 'the selected recipient' : 'the office'} from sending to
            delivery.
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => void query.refetch()}>
          <RefreshCw className="size-4" aria-hidden />
          Refresh
        </Button>
      </div>
      {query.isLoading ? (
        <Skeleton className="h-44 rounded-xl" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load messages"
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.length ? (
        <ul className="space-y-3">
          {query.data.slice(0, visibleCount).map((message) => {
            const welcomeImage = WHATSAPP_WELCOME_IMAGES.find(
              (image) => image.id === message.welcomeImageId,
            );
            return (
              <li key={message.id}>
                <Card className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{message.recipientName}</p>
                      <p className="mt-1 text-xs text-ink-subtle">
                        {message.recipientType === 'lawyer' ? 'Lawyer' : 'Client'} ·{' '}
                        {message.kind === 'automatic'
                          ? message.eventKey
                            ? WHATSAPP_AUTOMATION_DEFINITIONS[message.eventKey].title
                            : 'Automatic message'
                          : message.kind === 'welcome'
                            ? 'Welcome message'
                            : 'Office message'}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[message.status]}>
                      {message.status === 'accepted'
                        ? 'Awaiting delivery confirmation'
                        : WHATSAPP_MESSAGE_STATUS_AR[message.status]}
                    </Badge>
                  </div>
                  {message.body ? (
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                      {message.body}
                    </p>
                  ) : null}
                  {message.attachmentFileName ? (
                    <p className="flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
                      <Paperclip className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 break-words">
                        {welcomeImage
                          ? `Welcome image — ${welcomeImage.label}`
                          : message.attachmentFileName}
                      </span>
                      {welcomeImage ? (
                        <a
                          href={welcomeImage.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 shrink-0 items-center rounded px-2 text-xs font-semibold text-brand underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          aria-label={`View welcome image — ${welcomeImage.label}`}
                        >
                          View image
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                  {message.status === 'accepted' ? (
                    <p className="text-xs leading-6 text-ink-muted">
                      Waiting for confirmation that the message reached the recipient’s phone.
                    </p>
                  ) : null}
                  {message.status === 'uncertain' ? (
                    <p className="text-xs leading-6 text-warning">
                      The message may have been sent. Check the conversation before sending it
                      again.
                    </p>
                  ) : null}
                  {message.lastError ? (
                    <p
                      className={`text-xs leading-6 ${message.status === 'cancelled' || message.status === 'skipped' ? 'text-ink-muted' : 'text-danger'}`}
                    >
                      {message.lastError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-xs text-ink-subtle">
                    <time dateTime={message.createdAt}>
                      {dateFormatter.format(new Date(message.createdAt))}
                    </time>
                    <span dir="ltr">{formatIraqiMobile(message.phone)}</span>
                  </div>
                </Card>
              </li>
            );
          })}
          {query.data.length > visibleCount ? (
            <li>
              <Button
                type="button"
                variant="secondary"
                block
                onClick={() => setVisibleCount((count) => count + 10)}
              >
                Show older messages
              </Button>
            </li>
          ) : null}
        </ul>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Automatic messages and messages sent by the office will appear here."
          />
        </Card>
      )}
    </section>
  );
}
