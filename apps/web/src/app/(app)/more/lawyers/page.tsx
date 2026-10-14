'use client';

import { Mail, MessageCircle, Pencil, Phone, Plus, Search, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatLongDateAr, type LawyerSummary } from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Input } from '@muhami/ui';
import { LawyerFormSheet } from '@/components/lawyers/lawyer-form-sheet';
import { SettingsShell } from '@/components/settings/settings-shell';
import { ApiError } from '@/lib/api-client';
import { useLawyers } from '@/lib/api/lawyers';
import { useAuth } from '@/lib/auth-context';
import { useDebounced } from '@/lib/use-debounced';

export default function LawyersDirectoryPage() {
  const { can } = useAuth();
  const canRead =
    can('case:read.all') ||
    can('case:read.own') ||
    can('case:create') ||
    can('case:assign') ||
    can('user:read') ||
    can('user:update') ||
    can('whatsapp:send') ||
    can('transaction:read') ||
    can('transaction:create') ||
    can('transaction:update');
  const canManage = can('user:update');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<LawyerSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const debouncedSearch = useDebounced(search);
  const lawyers = useLawyers({ search: debouncedSearch || undefined, includeInactive }, canRead);
  return (
    <SettingsShell
      title="Office lawyers"
      subtitle="Add lawyers here, select them for cases or transactions, and send follow-up messages."
      actions={
        canManage ? (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add lawyer
          </Button>
        ) : null
      }
    >
      {!canRead ? (
        <EmptyState title="You do not have permission to view lawyers" />
      ) : (
        <div className="space-y-4">
          <label htmlFor="lawyer-directory-search" className="relative block">
            <span className="sr-only">Search for a lawyer</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
            />
            <Input
              id="lawyer-directory-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by lawyer name..."
              className="ps-9"
            />
          </label>
          {canManage ? (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="size-4 accent-brand"
              />
              Also show inactive lawyers
            </label>
          ) : null}
          {lawyers.isLoading ? (
            <Card className="p-5 text-sm text-ink-muted">Loading lawyers…</Card>
          ) : lawyers.isError ? (
            <ErrorState
              description={lawyers.error instanceof ApiError ? lawyers.error.messageAr : undefined}
              onRetry={() => void lawyers.refetch()}
            />
          ) : lawyers.data?.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {lawyers.data.map((lawyer) => (
                <Card key={lawyer.id} className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-subtle text-brand">
                      {lawyer.photoUrl ? (
                        <Image
                          src={lawyer.photoUrl}
                          alt={`Image ${lawyer.fullName}`}
                          fill
                          sizes="56px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <Users aria-hidden className="size-6" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-ink">{lawyer.fullName}</h2>
                      <Badge tone={lawyer.isActive ? 'success' : 'neutral'}>
                        {lawyer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditing(lawyer);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                    ) : null}
                  </div>
                  {lawyer.phone ? (
                    <a
                      href={`tel:${lawyer.phone}`}
                      className="flex items-center gap-2 text-sm text-ink-muted"
                    >
                      <Phone aria-hidden className="size-4" />
                      <span dir="ltr">{lawyer.phone}</span>
                    </a>
                  ) : (
                    <p className="text-xs text-ink-subtle">No mobile number added yet.</p>
                  )}
                  {lawyer.email ? (
                    <a
                      href={`mailto:${lawyer.email}`}
                      className="flex items-center gap-2 text-sm text-ink-muted"
                    >
                      <Mail aria-hidden className="size-4" />
                      <span dir="ltr" className="truncate">
                        {lawyer.email}
                      </span>
                    </a>
                  ) : null}
                  {lawyer.joinedAt ? (
                    <p className="text-xs text-ink-subtle">
                      Joined: {formatLongDateAr(new Date(lawyer.joinedAt))}
                    </p>
                  ) : null}
                  {lawyer.membershipNumber ? (
                    <p className="text-xs text-ink-subtle">
                      Membership number: {lawyer.membershipNumber}
                    </p>
                  ) : null}
                  <p className="border-t border-line pt-3 text-xs text-ink-subtle">
                    Assigned cases visible to you: {lawyer.assignedCaseCount}
                  </p>
                  {can('whatsapp:send') && lawyer.isActive && lawyer.phone ? (
                    <Link
                      href={`/whatsapp?recipientType=lawyer&recipientId=${lawyer.id}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-brand"
                    >
                      <MessageCircle className="size-4" />
                      Send a task or follow-up message
                    </Link>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={search ? 'No lawyers match your search' : 'No lawyers recorded yet'}
              description={
                search
                  ? 'Try another part of the name, or clear the search to show everyone.'
                  : canManage
                    ? "Start with the lawyer's name and mobile number. Add the photo, ID and other details later."
                    : 'Lawyers added by office administration appear here.'
              }
              action={
                search ? (
                  <Button variant="secondary" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                ) : canManage ? (
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Add first lawyer
                  </Button>
                ) : undefined
              }
            />
          )}
          {can('user:read') ? (
            <Link
              href="/more/users"
              className="inline-block text-sm font-medium text-brand hover:underline"
            >
              Manage access accounts and permissions
            </Link>
          ) : null}
        </div>
      )}
      {formOpen && canManage ? (
        <LawyerFormSheet
          profile={editing ?? undefined}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
    </SettingsShell>
  );
}
