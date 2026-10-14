import Image from 'next/image';
import { APP_NAME_AR } from '@muhami/shared';
import { cn } from '@muhami/ui';

/** The company's supplied artwork, used without redrawing or replacing its mark. */
export function BrandLogo({
  size = 48,
  className,
  priority = false,
  decorative = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full align-middle',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/apilsin-logo.jpg"
        alt={decorative ? '' : APP_NAME_AR}
        fill
        sizes={`${size}px`}
        priority={priority}
        className="scale-[1.095] object-cover"
      />
    </span>
  );
}
