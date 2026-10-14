import type { ReactNode } from 'react';
import { APP_SHORT_NAME_AR } from '@/lib/ui-shared';
import { DevsHubLogo as BrandLogo } from '@/components/brand/devshub-logo';
import { Scale, Users, FolderOpen, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
  footer,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,52fr)_minmax(0,48fr)] lg:gap-8 lg:p-8">
      <figure className="relative hidden h-[calc(100dvh-64px)] min-h-[560px] overflow-hidden rounded-[22px] bg-brand-solid p-10 text-brand-solid-ink lg:sticky lg:top-8 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-wide">
          <Scale className="size-5" aria-hidden />
          LEGAL OFFICE WORKSPACE
        </div>
        <div className="relative flex flex-1 items-center justify-center py-12" aria-hidden>
          <svg
            className="absolute inset-0 h-full w-full opacity-15"
            viewBox="0 0 500 500"
            fill="none"
          >
            <circle cx="250" cy="250" r="168" stroke="currentColor" />
            <circle cx="250" cy="250" r="116" stroke="currentColor" />
            <path d="M0 250H500M250 0V500" stroke="currentColor" />
          </svg>
          <div className="relative flex w-full max-w-[400px] flex-col items-center gap-8">
            <div className="flex size-36 items-center justify-center rounded-[28px] border border-white/20 bg-white/5">
              <svg viewBox="0 0 80 80" width="94" height="94" fill="none">
                <path
                  d="M24 4H43C63 4 76 19 76 40S63 76 43 76H24V52H46V28H24V4Z"
                  fill="currentColor"
                />
                <path d="M3 28H24V52H3Z" fill="#6366F1" />
              </svg>
            </div>
            <div className="grid w-full grid-cols-3 gap-3">
              {[
                { Icon: Users, label: 'Clients' },
                { Icon: FolderOpen, label: 'Cases' },
                { Icon: CheckCircle2, label: 'Progress' },
              ].map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-3 py-5"
                >
                  <Icon className="size-6" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <figcaption className="relative">
          <h2 className="max-w-lg font-display text-3xl font-semibold leading-tight">
            A clearer view of every case.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
            Clients, legal work, documents and fees — connected in one workspace.
          </p>
        </figcaption>
      </figure>
      <section
        aria-label="Sign in to the office account"
        className="flex min-h-dvh min-w-0 flex-col px-6 pb-6 pt-7 sm:px-10 lg:min-h-[calc(100dvh-64px)] lg:px-8 lg:pb-6 lg:pt-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo size={64} priority decorative />
            <div className="min-w-0">
              <p className="font-display text-xl font-bold leading-relaxed text-ink lg:text-2xl">
                {APP_SHORT_NAME_AR}
              </p>
              <p className="mt-1 text-[0.6875rem] font-medium leading-5 text-ink-muted lg:text-xs">
                Legal Office Management
              </p>
            </div>
          </div>
          <ThemeToggle className="size-11 shrink-0 rounded-full border-line-strong bg-transparent text-ink-muted shadow-none transition-colors hover:bg-surface-sunken hover:text-ink active:scale-100" />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center pb-16 pt-14 lg:pb-24 lg:pt-20">
          <header className="mb-7">
            {eyebrow ? <p className="mb-3 text-xs font-medium text-brand">{eyebrow}</p> : null}
            <h1 className="font-display text-3xl font-bold leading-relaxed text-ink lg:text-[2rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-sm leading-7 text-ink-muted">{description}</p>
            ) : null}
          </header>
          {children}
          {footer ? <div className="mt-6 text-center text-xs text-ink-muted">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
