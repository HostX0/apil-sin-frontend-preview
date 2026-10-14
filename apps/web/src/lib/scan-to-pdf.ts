'use client';

/**
 * Multi-page scan → PDF, in the browser, with no PDF library.
 *
 * Why hand-written rather than jsPDF or pdf-lib: the only thing needed here is
 * "wrap N JPEGs as N pages". JPEG can be embedded into a PDF verbatim as a
 * DCTDecode image XObject — no re-encoding, no rasterising, no font handling.
 * That makes this ~120 lines instead of a ~300 kB dependency on the critical
 * path of a mobile capture flow.
 *
 * Deliberately out of scope, and why:
 *   • no text layer — that needs OCR (Phase 18 REC-06)
 *   • no compression beyond the JPEGs themselves — they are already compressed
 *   • no Arabic text rendering — this file writes zero glyphs, which is exactly
 *     why the Arabic shaping risk (R-01) does not apply to it
 */

/** A4 at 72 dpi, the PDF default user-space unit. */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

interface PageImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/** Read intrinsic pixel dimensions out of a JPEG's SOF marker. */
async function readJpegSize(blob: Blob): Promise<{ width: number; height: number }> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let offset = 2; // skip SOI

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1]!;
    // SOF0–SOF15, excluding the non-frame markers DHT (c4), JPG (c8), DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (buffer[offset + 5]! << 8) | buffer[offset + 6]!;
      const width = (buffer[offset + 7]! << 8) | buffer[offset + 8]!;
      return { width, height };
    }

    const length = (buffer[offset + 2]! << 8) | buffer[offset + 3]!;
    offset += 2 + length;
  }

  // Fall back to A4 proportions rather than throwing: a page that scales
  // slightly wrong beats a capture flow that fails at the last step.
  return { width: 1240, height: 1754 };
}

/**
 * Build a PDF from JPEG page images.
 *
 * Each page is A4, with the image centred and scaled to fit while preserving
 * its aspect ratio — a photographed document should not be stretched.
 */
export async function buildPdfFromJpegs(pages: Blob[]): Promise<Blob> {
  if (pages.length === 0) throw new Error('No pages supplied');

  const images: PageImage[] = [];
  for (const page of pages) {
    const size = await readJpegSize(page);
    images.push({
      bytes: new Uint8Array(await page.arrayBuffer()),
      width: size.width,
      height: size.height,
    });
  }

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let position = 0;

  const encoder = new TextEncoder();
  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    position += bytes.length;
  };

  /** Object numbering: 1 catalog, 2 pages tree, then 3 objects per page. */
  const objectCount = 2 + images.length * 3;
  const markObject = (index: number) => {
    offsets[index] = position;
  };

  push('%PDF-1.4\n');
  // Binary comment: marks the file as binary for transfer agents.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const pageObjectIds = images.map((_, index) => 3 + index * 3);

  markObject(1);
  push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  markObject(2);
  push(
    `2 0 obj\n<< /Type /Pages /Count ${images.length} /Kids [${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(' ')}] >>\nendobj\n`,
  );

  images.forEach((image, index) => {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;

    // Fit inside A4 without distortion.
    const scale = Math.min(A4_WIDTH / image.width, A4_HEIGHT / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const x = (A4_WIDTH - drawWidth) / 2;
    const y = (A4_HEIGHT - drawHeight) / 2;

    markObject(pageId);
    push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH.toFixed(2)} ${A4_HEIGHT.toFixed(
        2,
      )}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );

    const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(
      2,
    )} cm\n/Im0 Do\nQ\n`;

    markObject(contentId);
    push(
      `${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
    );

    markObject(imageId);
    push(
      `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
    );
    push(image.bytes);
    push('\nendstream\nendobj\n');
  });

  const xrefPosition = position;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objectCount; index += 1) {
    xref += `${String(offsets[index] ?? 0).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);

  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`);

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}
