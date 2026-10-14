'use client';

import { MessageCircle, Smartphone } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { uuidSchema, type WhatsAppRecipientType } from '@muhami/shared';
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
import { MessageComposer } from '@/components/whatsapp/message-composer';
import { AutomaticMessages } from '@/components/whatsapp/automatic-messages';
import { MessageHistory } from '@/components/whatsapp/message-history';
import {
  NumberPanel,
  connectionLabel,
  isWhatsAppConnected,
} from '@/components/whatsapp/number-panel';
import { RecipientPicker, type MessageRecipient } from '@/components/whatsapp/recipient-picker';
import { usePageVisible } from '@/components/whatsapp/use-page-visible';
import { useClient } from '@/lib/api/clients';
import { useLawyers } from '@/lib/api/lawyers';
import {
  useSaveWhatsAppAutomation,
  useWhatsAppAutomations,
  useWhatsAppConnection,
} from '@/lib/api/whatsapp';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function WhatsAppPage() {
  const { can } = useAuth();
  const canRead = can('whatsapp:read');
  const canReadMessages = canRead && can('client:read.all');
  const canSend = can('whatsapp:send') && can('client:read.all');
  const canManageTemplates = can('whatsapp:templates.manage');
  const visible = usePageVisible();
  const params = useSearchParams();
  const [tab, setTab] = useState('messages');
  const [recipientType, setRecipientType] = useState<WhatsAppRecipientType>('client');
  const [recipient, setRecipient] = useState<MessageRecipient | null>(null);
  const [composingBusy, setComposingBusy] = useState(false);
  const appliedUrl = useRef('');
  const urlType = params.get('recipientType') === 'lawyer' ? 'lawyer' : 'client';
  const candidateId = params.get('recipientId') || params.get('clientId') || '';
  const urlId = uuidSchema.safeParse(candidateId).success ? candidateId : '';
  const client = useClient(canReadMessages && urlType === 'client' ? urlId : '');
  const lawyers = useLawyers(
    {},
    canReadMessages && canSend && urlType === 'lawyer' && Boolean(urlId),
  );
  const connection = useWhatsAppConnection(canRead && visible);
  const automations = useWhatsAppAutomations(canRead && canManageTemplates && tab === 'automatic');
  const saveAutomation = useSaveWhatsAppAutomation();
  const configured = connection.data?.configured ?? false;
  const connected = isWhatsAppConnected(connection.data?.status);

  useEffect(() => {
    const selectionKey = `${urlType}:${urlId}`;
    if (!urlId || appliedUrl.current === selectionKey) return;
    setRecipientType(urlType);
    if (urlType === 'client' && client.data?.id === urlId) {
      setRecipient({
        type: 'client',
        id: client.data.id,
        name: client.data.fullName,
        phone: client.data.mobile,
      });
      appliedUrl.current = selectionKey;
    } else if (urlType === 'lawyer') {
      const lawyer = lawyers.data?.find((item) => item.id === urlId);
      if (lawyer) {
        setRecipient({ type: 'lawyer', id: lawyer.id, name: lawyer.fullName, phone: lawyer.phone });
        appliedUrl.current = selectionKey;
      }
    }
  }, [urlId, urlType, client.data, lawyers.data]);

  if (!canRead)
    return (
      <Card className="p-6">
        <EmptyState
          title="You do not have WhatsApp access"
          description="Ask the office owner if you need this screen."
        />
      </Card>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MessageCircle className="size-6 text-brand" aria-hidden />
            Office WhatsApp
          </h1>
          <p className="mt-2 text-sm leading-7 text-ink-muted">
            Contact clients and lawyers, and send notices and documents from one place.
          </p>
        </div>
        {connection.data ? (
          <Badge tone={connected ? 'success' : 'warning'}>
            {connectionLabel(connection.data.status)}
          </Badge>
        ) : null}
      </div>
      {connection.isError ? (
        <ErrorState
          title="Could not check number status"
          description={
            connection.error instanceof ApiError ? connection.error.messageAr : undefined
          }
          onRetry={() => void connection.refetch()}
        />
      ) : null}
      {!connection.isLoading && connection.data && !configured ? (
        <div
          role="status"
          className="rounded-xl border border-warning/25 bg-warning-subtle p-4 text-sm leading-7 text-warning"
        >
          The WhatsApp service must be configured before linking the office number and sending
          messages.
        </div>
      ) : null}
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (!composingBusy && !saveAutomation.isPending) setTab(value);
        }}
      >
        <TabsList aria-label="WhatsApp sections">
          <TabsTrigger value="messages" disabled={composingBusy || saveAutomation.isPending}>
            Messages
          </TabsTrigger>
          <TabsTrigger value="number" disabled={composingBusy || saveAutomation.isPending}>
            Office number
          </TabsTrigger>
          {canManageTemplates ? (
            <TabsTrigger value="automatic" disabled={composingBusy || saveAutomation.isPending}>
              Automatic messages
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="messages" forceMount className="space-y-6 data-[state=inactive]:hidden">
          {canSend ? (
            <>
              {!connected && configured ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-subtle p-4">
                  <p className="text-sm leading-7 text-warning">
                    The office number is disconnected. Link it so messages can reach recipients.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={composingBusy}
                    onClick={() => setTab('number')}
                  >
                    <Smartphone className="size-4" aria-hidden />
                    Link office number
                  </Button>
                </div>
              ) : null}
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <Card className="space-y-4 p-4 sm:p-5">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm text-brand"
                      aria-hidden
                    >
                      1
                    </span>
                    Choose a recipient
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {(['client', 'lawyer'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={recipientType === type}
                        disabled={composingBusy}
                        className={cn(
                          'tap-target rounded-xl border px-3 text-sm font-semibold',
                          recipientType === type
                            ? 'border-brand bg-brand-subtle text-brand'
                            : 'border-line bg-surface text-ink-muted',
                        )}
                        onClick={() => {
                          setRecipientType(type);
                          setRecipient(null);
                          appliedUrl.current = `${urlType}:${urlId}`;
                        }}
                      >
                        {type === 'client' ? 'Client' : 'Lawyer'}
                      </button>
                    ))}
                  </div>
                  <RecipientPicker
                    key={recipientType}
                    recipientType={recipientType}
                    selected={recipient}
                    disabled={composingBusy}
                    onSelect={(selected) => {
                      appliedUrl.current = `${urlType}:${urlId}`;
                      setRecipient(selected);
                    }}
                  />
                  {urlId && (client.isError || lawyers.isError) ? (
                    <p role="alert" className="text-xs text-danger">
                      Could not open the recipient. Choose them from the list.
                    </p>
                  ) : null}
                </Card>
                {connection.isLoading ? (
                  <Skeleton className="h-72 rounded-xl" />
                ) : (
                  <MessageComposer
                    recipient={recipient}
                    configured={configured}
                    connected={connected}
                    onBusyChange={setComposingBusy}
                  />
                )}
              </div>
            </>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {recipient ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={composingBusy}
                onClick={() => {
                  appliedUrl.current = `${urlType}:${urlId}`;
                  setRecipient(null);
                }}
              >
                View messages for all recipients
              </Button>
            ) : null}
          </div>
          {canReadMessages ? (
            <MessageHistory
              filters={
                recipient ? { recipientType: recipient.type, recipientId: recipient.id } : {}
              }
              active={tab === 'messages'}
            />
          ) : (
            <Card className="p-5">
              <EmptyState
                title="Messages are unavailable for your account"
                description="Ask office administration for message and recipient access."
              />
            </Card>
          )}
        </TabsContent>
        <TabsContent value="number">
          <NumberPanel
            connection={connection.data}
            refreshConnection={() => void connection.refetch()}
            openMessages={() => setTab('messages')}
          />
        </TabsContent>
        {canManageTemplates ? (
          <TabsContent value="automatic" forceMount className="data-[state=inactive]:hidden">
            <AutomaticMessages
              templates={automations.data}
              loading={automations.isLoading}
              error={automations.error}
              configured={configured}
              connected={connected}
              saving={saveAutomation.isPending}
              retry={() => void automations.refetch()}
              save={(template) => saveAutomation.mutateAsync(template)}
              reload={async (eventKey) => {
                const result = await automations.refetch();
                if (result.error) throw result.error;
                return result.data?.find((template) => template.eventKey === eventKey);
              }}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
