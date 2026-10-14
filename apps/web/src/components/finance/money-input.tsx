'use client';

import { useEffect, useRef, useState } from 'react';
import { foldArabicDigits, formatMoney, parseMoneyInput } from '@/lib/ui-shared';
import { Input } from '@muhami/ui';

/**
 * Money input.
 *
 * Holds the raw text the user typed and emits minor units as a decimal string
 * — never a JS number, at any point. Arabic-Indic digits and thousands
 * separators are accepted; grouping is shown back as confirmation so a
 * mistyped extra zero is visible before submit rather than after.
 */
export function MoneyInput({
  value,
  onChange,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  placeholder = '250000',
  disabled,
}: {
  /** Minor units as a decimal string, or '' when empty. */
  value: string;
  onChange: (minorUnits: string) => void;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value);
  const lastEmitted = useRef(value);

  // Re-sync when the parent resets the field (form open, successful submit).
  useEffect(() => {
    if (value !== lastEmitted.current || value === '') setText(value);
    lastEmitted.current = value;
  }, [value]);

  const handle = (raw: string) => {
    setText(raw);

    const cleaned = foldArabicDigits(raw).replace(/[\s,٬]/g, '');
    if (cleaned === '') {
      lastEmitted.current = '';
      onChange('');
      return;
    }

    try {
      const parsed = parseMoneyInput(cleaned).toString();
      lastEmitted.current = parsed;
      onChange(parsed);
    } catch {
      // Keep the text so the user can finish typing; the empty value keeps the
      // submit button disabled until it parses.
      lastEmitted.current = '';
      onChange('');
    }
  };

  const preview = value && value !== '0' ? formatMoney(BigInt(value)) : null;

  return (
    <div className="space-y-1">
      <Input
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        value={text}
        onChange={(event) => handle(event.target.value)}
        inputMode="numeric"
        dir="ltr"
        placeholder={placeholder}
        disabled={disabled}
        className="text-lg font-semibold"
      />
      {preview ? (
        <p className="ltr-numerals text-xs text-ink-subtle" aria-live="polite">
          {preview}
        </p>
      ) : null}
    </div>
  );
}
