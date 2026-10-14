'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@muhami/ui';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('muhami-theme', next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'tap-target flex items-center justify-center rounded-xl border border-line/80 bg-surface/80 text-ink-muted shadow-xs transition-[background-color,color,transform] hover:bg-surface-sunken hover:text-ink active:scale-95',
        className,
      )}
    >
      {theme === 'dark' ? (
        <Sun className="size-[1.1rem]" aria-hidden />
      ) : (
        <Moon className="size-[1.1rem]" aria-hidden />
      )}
    </button>
  );
}
