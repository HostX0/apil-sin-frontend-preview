import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import localFont from 'next/font/local';
import {
  APP_DESCRIPTION_AR,
  APP_LOCALE,
  APP_NAME_AR,
  APP_SHORT_NAME_AR,
  APP_TITLE_AR,
} from '@/lib/ui-shared';
import { Providers } from '@/components/providers';
import './globals.css';

const productFont = localFont({
  src: [
    { path: './fonts/inter-400.woff', weight: '400', style: 'normal' },
    { path: './fonts/inter-500.woff', weight: '500', style: 'normal' },
    { path: './fonts/inter-600.woff', weight: '600', style: 'normal' },
    { path: './fonts/inter-700.woff', weight: '700', style: 'normal' },
  ],
  variable: '--font-product',
  display: 'swap',
});

/**
 * Every route renders per request.
 *
 * Required by the CSP nonce in `src/middleware.ts`: a prerendered page carries
 * the HTML generated at build time, which has no nonce, so every inline script
 * Next emits is blocked and the app does not hydrate at all. Verified, not
 * assumed — it is what the Phase 16 accessibility suite caught.
 *
 * The frontend preview uses the same nonce policy on every application page.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: `${APP_TITLE_AR} — Preview`,
    template: `%s · ${APP_SHORT_NAME_AR}`,
  },
  description: APP_DESCRIPTION_AR,
  applicationName: APP_NAME_AR,
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    // The home-screen label. iOS truncates hard, so the short form.
    title: APP_SHORT_NAME_AR,
  },
  formatDetection: {
    // Stops iOS from turning every case number into a phone link.
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/devshub-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/devshub-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/devshub-apple-touch.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0B' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Zoom stays enabled: disabling it is an accessibility failure, and lawyers
  // pinch-zoom scanned documents constantly.
  maximumScale: 5,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The nonce the middleware minted for this request. Read from the request
  // headers rather than regenerated, or it would not match the policy.
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  return (
    <html
      lang={APP_LOCALE}
      dir="ltr"
      data-product="devshub"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={productFont.variable}
    >
      <body>
        {/* Applies the stored theme before first paint, so a dark-mode user
            never sees a white flash on load. It has to be inline and it has to
            run before React, which is exactly the case a CSP nonce exists for. */}
        <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('muhami-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
            }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
