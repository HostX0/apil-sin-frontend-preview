'use client';

import { Download, Printer } from 'lucide-react';
import { Button, cn } from '@muhami/ui';
import { usePdf, type PdfOptions } from '@/lib/api/pdf';
import { Can } from '@/lib/auth-context';

/**
 * Print / download a generated document.
 *
 * Two affordances rather than one: a lawyer in the office wants a preview to
 * send to the printer, and the same lawyer in a courthouse wants the file on
 * their phone. Both go through the same endpoint with the same settings, which
 * is what makes the printed output match the preview.
 */
export function PrintButton({
  path,
  label = 'Print',
  options,
  variant = 'secondary',
  size = 'sm',
  showDownload = true,
  className,
}: {
  path: string;
  label?: string;
  options?: PdfOptions;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  showDownload?: boolean;
  className?: string;
}) {
  const pdf = usePdf();
  const busy = pdf.pending === path;

  return (
    <Can permission="pdf:generate">
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          variant={variant}
          size={size}
          loading={busy}
          onClick={() => void pdf.open(path, 'inline', options)}
        >
          <Printer className="size-4" />
          {label}
        </Button>

        {showDownload ? (
          <button
            type="button"
            onClick={() => void pdf.open(path, 'attachment', options)}
            disabled={busy}
            aria-label="Download PDF"
            className="tap-target flex items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Download className="size-4" />
          </button>
        ) : null}

        {pdf.error ? (
          <span role="alert" className="text-xs text-danger">
            {pdf.error}
          </span>
        ) : null}
      </div>
    </Can>
  );
}
