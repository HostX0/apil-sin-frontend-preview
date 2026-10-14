'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../lib/cn';

/**
 * Bottom sheet — the quick-create surface for the four dashboard action cards.
 *
 * Rises from the bottom on mobile and centres as a dialog from `sm` up, so the
 * same component serves the phone shell and the desktop console. Radix handles
 * focus trapping, scroll locking and Escape.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: string;
    description?: string;
  }
>(function SheetContent({ className, title, description, children, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim/60 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col border border-line bg-surface shadow-lg',
          // Mobile: full-width sheet anchored to the bottom, safe-area aware.
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl pb-safe-bottom data-[state=open]:animate-sheet-in',
          // Desktop: centred dialog.
          'sm:inset-auto sm:start-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:w-full sm:max-w-lg',
          'sm:-translate-y-1/2 sm:ltr:-translate-x-1/2 sm:rtl:translate-x-1/2 sm:rounded-2xl sm:data-[state=open]:animate-fade-in',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div className="min-w-0 space-y-0.5">
            <DialogPrimitive.Title className="text-lg font-semibold text-ink">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-ink-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              // Radix warns when a dialog has no description; supply an empty
              // one rather than leaving the accessibility tree incomplete.
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="tap-target -me-2 -mt-2 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
            aria-label="Close"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

/** Sticky action bar for sheet forms — always reachable above the keyboard. */
export function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex gap-2 border-t border-line bg-surface p-4">
      {children}
    </div>
  );
}
