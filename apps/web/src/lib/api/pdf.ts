'use client';

import { useCallback, useState } from 'react';

/** PDF generation is unavailable in the standalone frontend preview. */
export type PdfDisposition = 'inline' | 'attachment';

export interface PdfOptions {
  arabicNumerals?: boolean;
  showLogo?: boolean;
  watermark?: string;
}

export function usePdf() {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (path: string, disposition: PdfDisposition = 'inline', options: PdfOptions = {}) => {
      setPending(path);
      setError(null);

      // No API URL or server credentials exist in this preview.
      void disposition;
      void options;
      setError('PDF generation is unavailable in this frontend preview.');
      setPending(null);
    },
    [],
  );

  return { open, pending, error, clearError: () => setError(null) };
}

export const pdfPaths = {
  receipt: (id: string) => `/pdf/receipts/${id}`,
  financeMovementReceipt: (id: string) => `/pdf/finance-movements/${id}/receipt`,
  financeAccountStatement: (id: string) => `/pdf/finance-accounts/${id}/statement`,
  financeWorkspaceStatement: '/pdf/finance-workspace/statement',
  caseSummary: (id: string) => `/pdf/cases/${id}/summary`,
  clientProfile: (id: string) => `/pdf/clients/${id}/profile`,
  feeAgreement: (caseId: string, agreementId: string) =>
    `/pdf/cases/${caseId}/fee-agreements/${agreementId}`,
  powerOfAttorney: (caseId: string, poaId: string) =>
    `/pdf/cases/${caseId}/powers-of-attorney/${poaId}`,
  financialStatement: '/pdf/financial-statement',
};
