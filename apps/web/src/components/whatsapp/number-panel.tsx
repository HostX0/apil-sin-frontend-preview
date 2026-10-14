'use client';

import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { QrCode, RefreshCw, Smartphone } from 'lucide-react';
import { useEffect } from 'react';
import { formatIraqiMobile, type WhatsAppConnection } from '@muhami/shared';
import { Badge, Button, Card, Skeleton } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useConnectWhatsApp, useWhatsAppQr, whatsappKeys } from '@/lib/api/whatsapp';
import { usePageVisible } from './use-page-visible';

export function isWhatsAppConnected(status: string | undefined) {
  return ['connected', 'ready', 'open', 'online', 'authenticated'].includes(
    status?.toLowerCase() ?? '',
  );
}

export function connectionLabel(status: string | undefined) {
  if (!status || status === 'unknown') return 'Number status not yet known';
  if (isWhatsAppConnected(status)) return 'Connected';
  if (['connecting', 'starting', 'pairing', 'initializing'].includes(status?.toLowerCase() ?? ''))
    return 'Preparing connection';
  if (['qr', 'qr_ready', 'awaiting_scan', 'scan_qr_code'].includes(status?.toLowerCase() ?? ''))
    return 'Waiting for code to be scanned';
  return 'Number disconnected';
}

export function NumberPanel({
  connection,
  refreshConnection,
  openMessages,
}: {
  connection: WhatsAppConnection | undefined;
  refreshConnection: () => void;
  openMessages: () => void;
}) {
  const { can } = useAuth();
  const canConnect = can('whatsapp:connect');
  const visible = usePageVisible();
  const connected = isWhatsAppConnected(connection?.status);
  const configured = connection?.configured ?? false;
  const qrEnabled = visible && configured && canConnect && !connected;
  const qr = useWhatsAppQr(qrEnabled);
  const connect = useConnectWhatsApp();
  const queryClient = useQueryClient();
  const qrStatus = qr.data?.status;

  useEffect(() => {
    if (!qrEnabled) queryClient.removeQueries({ queryKey: whatsappKeys.qr() });
    return () => {
      void queryClient.cancelQueries({ queryKey: whatsappKeys.qr() });
      queryClient.removeQueries({ queryKey: whatsappKeys.qr() });
    };
  }, [qrEnabled, queryClient]);

  useEffect(() => {
    if (!qrStatus || !isWhatsAppConnected(qrStatus)) return;
    queryClient.setQueryData<WhatsAppConnection>(whatsappKeys.connection(), (previous) =>
      previous ? { ...previous, status: qrStatus } : previous,
    );
  }, [qrStatus, queryClient]);

  const code =
    qrEnabled &&
    !connect.isPending &&
    !qr.isError &&
    !isWhatsAppConnected(qr.data?.status) &&
    qr.data?.qrCode &&
    /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=\s]+$/.test(qr.data.qrCode)
      ? qr.data.qrCode
      : null;

  const prepare = async () => {
    try {
      await connect.mutateAsync();
      refreshConnection();
      await qr.refetch();
    } catch {
      // The mutation state keeps the actionable error visible below the button.
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-subtle text-brand">
            <Smartphone className="size-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Office WhatsApp number</h2>
            <Badge tone={connected ? 'success' : 'warning'}>
              {connectionLabel(connection?.status)}
            </Badge>
          </div>
        </div>
        {connection?.phone ? (
          <p className="font-semibold text-ink" dir="ltr">
            {formatIraqiMobile(connection.phone)}
          </p>
        ) : null}
        <p className="text-sm leading-7 text-ink-muted">
          The office owner links the number once. The team then sends messages from the system
          according to their permissions.
        </p>
        {connected ? (
          <div className="space-y-3 rounded-xl bg-success-subtle px-3 py-2.5">
            <p className="text-sm leading-7 text-success">
              The number is connected and ready. You can send messages or enable automatic messages.
            </p>
            <Button type="button" onClick={openMessages}>
              Go to messages
            </Button>
          </div>
        ) : null}
        {!configured && connection ? (
          <p className="rounded-xl bg-warning-subtle px-3 py-2.5 text-sm leading-7 text-warning">
            Complete WhatsApp setup first. The pairing code will appear here when the service is
            ready.
          </p>
        ) : null}
        {!canConnect && !connected && configured ? (
          <p className="text-sm leading-7 text-ink-muted">
            Only the office owner can link the number. Ask them to scan the code from their account.
          </p>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={refreshConnection}>
          <RefreshCw className="size-4" aria-hidden />
          Refresh status
        </Button>
      </Card>

      {canConnect && configured && !connected ? (
        <Card className="space-y-5 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <QrCode className="size-5 text-brand" aria-hidden />
              Link phone
            </h2>
            <p className="mt-2 text-sm leading-7 text-ink-muted">
              Open WhatsApp on the office phone and scan the code below to link it.
            </p>
          </div>
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-line bg-white p-4">
            {code ? (
              <Image
                src={code}
                alt="Office WhatsApp pairing code"
                width={256}
                height={256}
                unoptimized
                className="h-auto max-w-full"
              />
            ) : qr.isLoading || connect.isPending ? (
              <Skeleton className="size-56" />
            ) : (
              <p className="max-w-xs text-center text-sm leading-7 text-slate-600">
                Select Show pairing code. It may take a few seconds to appear and refreshes
                automatically while this tab is open.
              </p>
            )}
          </div>
          <ol className="list-inside list-decimal space-y-2 text-sm leading-7 text-ink-muted">
            <li>Open WhatsApp on the office phone.</li>
            <li>Choose Linked devices, then Link a device.</li>
            <li>Point the camera at the code above and wait for Connected to appear.</li>
          </ol>
          {connect.isError || qr.isError ? (
            <p role="alert" className="rounded-xl bg-danger-subtle px-3 py-2.5 text-sm text-danger">
              {connect.error instanceof ApiError
                ? connect.error.messageAr
                : qr.error instanceof ApiError
                  ? qr.error.messageAr
                  : 'Could not prepare the code. Try again.'}
            </p>
          ) : null}
          <Button type="button" block loading={connect.isPending} onClick={() => void prepare()}>
            <RefreshCw className="size-4" aria-hidden />
            {code ? 'Refresh pairing code' : 'Show pairing code'}
          </Button>
          <p className="text-xs leading-6 text-ink-subtle">
            The code is temporary and refreshes automatically. It is hidden when you leave this tab.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
