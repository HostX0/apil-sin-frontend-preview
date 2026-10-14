import type { Config } from 'tailwindcss';
import preset from '@muhami/ui/tailwind-preset';

export default {
  presets: [preset as Config],
  content: [
    './src/**/*.{ts,tsx}',
    // The UI package is consumed as source, so its classes must be scanned too.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
