import { cn } from '@muhami/ui';

/** Authentic DevsHub geometric D; the foreground follows the active theme. */
export function DevsHubLogo({
  size = 48,
  className,
  decorative = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center text-ink', className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        fill="none"
        aria-hidden={decorative || undefined}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : 'DevsHub'}
      >
        <path d="M24 4H43C63 4 76 19 76 40S63 76 43 76H24V52H46V28H24V4Z" fill="currentColor" />
        <path d="M3 28H24V52H3Z" fill="#6366F1" />
      </svg>
    </span>
  );
}
