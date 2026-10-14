import { zodResolver as sharedZodResolver } from '@hookform/resolvers/zod';
import { uiEnglish } from './ui-english';

function localizeErrors(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const [key, item] of Object.entries(value)) {
    if (key === 'ref') continue;
    if (key === 'message' && typeof item === 'string') {
      (value as Record<string, unknown>)[key] = uiEnglish(item, 'Please check this field.');
    } else if (key === 'types' && item && typeof item === 'object') {
      for (const [type, message] of Object.entries(item)) {
        if (typeof message === 'string') {
          (item as Record<string, unknown>)[type] = uiEnglish(message, 'Please check this field.');
        }
      }
    } else localizeErrors(item, seen);
  }
}

/** Original shared schemas validate and transform inputs; only displayed errors are localized. */
export const zodResolver: typeof sharedZodResolver = (...args) => {
  const resolve = sharedZodResolver(...args);
  return async (...input) => {
    const result = await resolve(...input);
    localizeErrors(result.errors);
    const fields = result.errors as Record<
      string,
      { message?: string; types?: Record<string, unknown> }
    >;
    for (const [field, prompt] of [
      ['clientId', 'Choose a client.'],
      ['courtId', 'Choose a court.'],
    ] as const) {
      const selected = input[0]?.[field];
      const error = fields[field];
      if (
        (selected === '' || selected === null || selected === undefined) &&
        error?.message === 'Invalid identifier.'
      ) {
        error.message = prompt;
        for (const [type, message] of Object.entries(error.types ?? {})) {
          if (message === 'Invalid identifier.') error.types![type] = prompt;
        }
      }
    }
    return result;
  };
};
