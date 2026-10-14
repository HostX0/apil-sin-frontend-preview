'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../lib/cn';

export const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(function Label({ className, required, children, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn('text-sm font-medium text-ink', className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="ms-1 text-danger" aria-hidden>
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink',
          'placeholder:text-ink-subtle transition-colors',
          'focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full rounded-md border border-line-strong bg-surface p-3 text-base text-ink',
        'placeholder:text-ink-subtle transition-colors',
        'focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  );
});

/**
 * Field wrapper: label, control, error and hint in the layout every form uses.
 *
 * The error is wired with aria-describedby and aria-invalid rather than being a
 * red paragraph that a screen reader never associates with the input.
 */
export function Field({
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
