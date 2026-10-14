import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('card-surface', className)} {...props} />;
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn('flex flex-col gap-1 p-4 pb-2', className)} {...props} />;
  },
);

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  // `children` is passed explicitly rather than through the spread so that
  // static analysis can see a heading is never rendered empty — an empty <h3>
  // is a landmark a screen reader announces and then says nothing about.
  function CardTitle({ className, children, ...props }, ref) {
    return (
      <h3 ref={ref} className={cn('text-base font-semibold text-ink', className)} {...props}>
        {children}
      </h3>
    );
  },
);

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-sm text-ink-muted', className)} {...props} />;
});

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-4 pt-2', className)} {...props} />;
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex items-center gap-2 p-4 pt-0', className)} {...props} />
    );
  },
);
