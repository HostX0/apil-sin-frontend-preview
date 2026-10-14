'use client';

import type { UploadTicket } from '@muhami/shared';

/** Storage uploads are deliberately disabled in the standalone preview. */
export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly messageAr: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export function uploadToStorage(
  _ticket: Pick<UploadTicket, 'uploadUrl' | 'requiredContentType'>,
  _file: Blob,
  _options: {
    onProgress?: (progress: UploadProgress) => void;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  } = {},
): Promise<void> {
  return Promise.reject(
    new UploadError(
      'Preview upload unavailable',
      'File uploads are unavailable in this frontend preview.',
    ),
  );
}

/** SHA-256 of the bytes, for integrity and future deduplication. */
export async function sha256Hex(file: Blob): Promise<string | undefined> {
  // Requires a secure context; absent over plain HTTP on a LAN, which is a
  // legitimate deployment. The checksum is optional for exactly this reason.
  if (!globalThis.crypto?.subtle) return undefined;

  try {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

/**
 * Downscale a photo before upload.
 *
 * A modern phone camera produces 4–8 MB per page. A court document is legible
 * at 1600px on the long edge, and the difference is the whole upload budget on
 * a mobile connection.
 */
export async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.82,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new UploadError('No 2D context', 'Could not process the image.');

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new UploadError('toBlob failed', 'Could not process the image.');

  return { blob, width, height };
}

/** Small JPEG preview, uploaded alongside the original as a separate object. */
export async function makeThumbnail(file: File | Blob): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7));
  } catch {
    return null;
  }
}
