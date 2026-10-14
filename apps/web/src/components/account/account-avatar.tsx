'use client';

import Image from 'next/image';
import { cn } from '@muhami/ui';
import { useAccountProfile } from '@/lib/api/account';
import { useAuth } from '@/lib/auth-context';

export function AccountAvatar({ className }: { className?: string }) {
  const { user } = useAuth();
  const profile = useAccountProfile();
  const name = profile.data?.fullName ?? user?.fullName ?? '';

  return (
    <span
      className={cn(
        'relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-subtle text-sm font-bold text-brand',
        className,
      )}
      aria-hidden
    >
      {profile.data?.avatarUrl ? (
        <Image
          src={profile.data.avatarUrl}
          alt=""
          fill
          priority
          sizes="64px"
          unoptimized
          className="object-cover"
        />
      ) : (
        name.trim().charAt(0) || '?'
      )}
    </span>
  );
}
