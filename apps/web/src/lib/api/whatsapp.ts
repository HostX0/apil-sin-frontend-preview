'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateWhatsAppMessageInput,
  ListWhatsAppMessagesQuery,
  PresignWhatsAppAttachmentInput,
  PresignWhatsAppWelcomeImageInput,
  WhatsAppAttachmentTicket,
  WhatsAppAutomationTemplate,
  WhatsAppConnection,
  WhatsAppMessageItem,
  WhatsAppQr,
} from '@muhami/shared';
import { api, apiFetch } from '@/lib/api-client';
import { sendOrQueue } from '@/lib/offline';

export const whatsappKeys = {
  all: ['whatsapp'] as const,
  connection: () => ['whatsapp', 'connection'] as const,
  qr: () => ['whatsapp', 'qr'] as const,
  automations: () => ['whatsapp', 'automations'] as const,
  messages: (filters: ListWhatsAppMessagesQuery) => ['whatsapp', 'messages', filters] as const,
};

export function useWhatsAppAutomations(enabled = true) {
  return useQuery({
    queryKey: whatsappKeys.automations(),
    queryFn: ({ signal }) =>
      api.get<WhatsAppAutomationTemplate[]>('/whatsapp/automations', {
        signal,
        cache: 'no-store',
      }),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useSaveWhatsAppAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    // A configuration save must either finish now or show an error; unlike a
    // message, it must not wait silently offline and lock the editor's tabs.
    networkMode: 'always',
    onMutate: () => queryClient.cancelQueries({ queryKey: whatsappKeys.automations() }),
    mutationFn: (template: WhatsAppAutomationTemplate) =>
      apiFetch<WhatsAppAutomationTemplate>(`/whatsapp/automations/${template.eventKey}`, {
        method: 'PUT',
        body: {
          body: template.body,
          enabled: template.enabled,
          version: template.version,
          welcomeImageEnabled: template.welcomeImageEnabled,
          welcomeImageId: template.welcomeImageId,
          welcomeUpload: template.welcomeUpload ?? null,
        },
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData<WhatsAppAutomationTemplate[]>(
        whatsappKeys.automations(),
        (previous) =>
          previous?.map((template) => (template.eventKey === saved.eventKey ? saved : template)),
      );
      void queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: whatsappKeys.automations() }),
  });
}

export function useWhatsAppConnection(enabled = true) {
  return useQuery({
    queryKey: whatsappKeys.connection(),
    queryFn: ({ signal }) =>
      api.get<WhatsAppConnection>('/whatsapp/connection', { signal, cache: 'no-store' }),
    enabled,
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useConnectWhatsApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<WhatsAppConnection>('/whatsapp/connection/connect'),
    onSuccess: (connection) => {
      queryClient.setQueryData(whatsappKeys.connection(), connection);
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.qr() });
    },
  });
}

/** Pairing codes live only in memory while the pairing panel is mounted. */
export function useWhatsAppQr(enabled: boolean) {
  return useQuery({
    queryKey: whatsappKeys.qr(),
    queryFn: ({ signal }) =>
      api.get<WhatsAppQr>('/whatsapp/connection/qr', { signal, cache: 'no-store' }),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useWhatsAppMessages(filters: ListWhatsAppMessagesQuery, enabled: boolean) {
  return useQuery({
    queryKey: whatsappKeys.messages(filters),
    queryFn: ({ signal }) =>
      api.get<WhatsAppMessageItem[]>('/whatsapp/messages', {
        query: filters,
        signal,
        cache: 'no-store',
      }),
    enabled,
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    // The mutation must execute offline so sendOrQueue can persist the request.
    networkMode: 'always',
    mutationFn: (input: CreateWhatsAppMessageInput & { recipientName: string }) => {
      const { recipientName, ...body } = input;
      return sendOrQueue<WhatsAppMessageItem>({
        method: 'POST',
        path: '/whatsapp/messages',
        body,
        labelAr: `WhatsApp message to ${recipientName}`,
        invalidate: [['whatsapp']],
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
  });
}

export async function presignWhatsAppAttachment(input: PresignWhatsAppAttachmentInput) {
  return api.post<WhatsAppAttachmentTicket>('/whatsapp/attachments/presign', input);
}

export async function presignWhatsAppWelcomeImage(
  input: PresignWhatsAppWelcomeImageInput,
  signal?: AbortSignal,
) {
  return api.post<WhatsAppAttachmentTicket>(
    '/whatsapp/automations/client.created/image/presign',
    input,
    { signal },
  );
}

/** Expiring private previews are held by the editor only, never in the query cache. */
export async function getWhatsAppWelcomeImagePreview(signal?: AbortSignal) {
  return api.get<{ url: string; expiresIn: number }>('/whatsapp/automations/client.created/image', {
    signal,
    cache: 'no-store',
  });
}
