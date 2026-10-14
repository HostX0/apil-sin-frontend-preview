'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AllowedMimeType,
  CreateDocumentInput,
  DocumentDetail,
  DocumentListItem,
  DownloadTicket,
  ListDocumentsQuery,
  Page,
  UploadInitInput,
  UploadTicket,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { previewUnavailable } from '@/lib/preview-unavailable';
import { caseKeys } from '@/lib/api/cases';
import { makeThumbnail, sha256Hex, uploadToStorage, type UploadProgress } from '@/lib/upload';

export const documentKeys = {
  all: ['documents'] as const,
  list: (filters: Partial<ListDocumentsQuery>) => ['documents', 'list', filters] as const,
  detail: (id: string) => ['documents', 'detail', id] as const,
};

export function useDocumentList(
  filters: Partial<ListDocumentsQuery>,
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: documentKeys.list(filters),
    initialPageParam: undefined as string | undefined,
    enabled: options.enabled ?? true,
    queryFn: ({ pageParam }) =>
      api.get<Page<DocumentListItem>>('/documents', {
        query: {
          search: filters.search,
          docType: filters.docType,
          caseId: filters.caseId,
          transactionId: filters.transactionId,
          clientId: filters.clientId,
          expiringWithinDays: filters.expiringWithinDays,
          sort: filters.sort ?? 'recent',
          limit: filters.limit ?? 25,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => api.get<DocumentDetail>(`/documents/${id}`),
    enabled: Boolean(id),
  });
}

/** Fetch a fresh short-lived download URL every time. */
export function useDownloadUrl() {
  return useMutation({
    mutationFn: async (_request: {
      id: string;
      disposition: 'inline' | 'attachment';
      versionId?: string;
    }): Promise<DownloadTicket> => {
      throw previewUnavailable('Document downloads are unavailable in this frontend preview.');
    },
  });
}

export interface UploadRequest {
  file: Blob;
  fileName: string;
  mimeType: AllowedMimeType;
  metadata: Omit<
    CreateDocumentInput,
    'objectKey' | 'fileName' | 'mimeType' | 'sizeBytes' | 'checksum' | 'thumbnailKey'
  >;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

/** The full three-step upload, as one mutation. */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UploadRequest): Promise<DocumentDetail> => {
      const sizeBytes = request.file.size;

      const ticket = await api.post<UploadTicket>('/documents/upload-init', {
        fileName: request.fileName,
        mimeType: request.mimeType,
        sizeBytes,
      } satisfies UploadInitInput);

      await uploadToStorage(ticket, request.file, {
        onProgress: request.onProgress,
        signal: request.signal,
      });

      const checksum = await sha256Hex(request.file);
      const thumbnailKey = await uploadThumbnail(request);

      return api.post<DocumentDetail>('/documents', {
        ...request.metadata,
        objectKey: ticket.objectKey,
        fileName: request.fileName,
        mimeType: request.mimeType,
        sizeBytes,
        checksum,
        thumbnailKey,
      });
    },
    onSuccess: (document) => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
      if (document.caseId) {
        void queryClient.invalidateQueries({ queryKey: caseKeys.detail(document.caseId) });
      }
    },
  });
}

/** Best-effort: a missing thumbnail costs a nicer list, never the upload. */
async function uploadThumbnail(request: UploadRequest): Promise<string | undefined> {
  if (!request.mimeType.startsWith('image/')) return undefined;

  try {
    const thumbnail = await makeThumbnail(request.file);
    if (!thumbnail) return undefined;

    const ticket = await api.post<UploadTicket>('/documents/upload-init', {
      fileName: `thumb-${request.fileName}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: thumbnail.size,
    } satisfies UploadInitInput);

    await uploadToStorage(ticket, thumbnail);
    return ticket.objectKey;
  } catch {
    return undefined;
  }
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/documents/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: documentKeys.all }),
  });
}
