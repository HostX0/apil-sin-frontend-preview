'use client';

import { Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@muhami/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'muhami-install-dismissed';

/**
 * Install prompt.
 *
 * Two paths, because the platforms differ fundamentally:
 *   • Android/Chrome fires `beforeinstallprompt` and we can show a real button.
 *   • iOS Safari has no such event — the only route is Share → Add to Home
 *     Screen, so iOS users get instructions rather than a button that cannot
 *     work. Pretending otherwise is how "install" buttons end up doing nothing.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari =
      /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

    if (isIos && isSafari) {
      setShowIosHint(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDeferred(null);
    setShowIosHint(false);
  };

  if (!deferred && !showIosHint) return null;

  return (
    <div className="card-surface relative flex items-start gap-3 p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide"
        className="tap-target absolute end-1 top-1 flex items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken"
      >
        <X className="size-4" />
      </button>

      <div className="min-w-0 flex-1 space-y-2 pe-8">
        <p className="text-sm font-semibold text-ink">Install the app on your device</p>

        {showIosHint ? (
          <p className="text-sm leading-relaxed text-ink-muted">
            Tap the Share button
            <Share className="mx-1 inline size-4 align-text-bottom" aria-hidden />
            at the bottom of the browser, then choose Add to Home Screen.
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Open the system directly from your home screen, with quicker access and no browser
              bar.
            </p>
            <Button
              size="sm"
              onClick={async () => {
                if (!deferred) return;
                await deferred.prompt();
                await deferred.userChoice;
                dismiss();
              }}
            >
              Install app
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
