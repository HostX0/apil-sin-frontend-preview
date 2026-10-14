'use client';

import { Bookmark, BookmarkPlus, Download, Trash2, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { ExportScope, Permission, SavedSearchScope } from '@muhami/shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useCreateSavedSearch, useDeleteSavedSearch, useSavedSearches } from '@/lib/api/search';
import { Can } from '@/lib/auth-context';

/** Which permission each export scope requires, from the Phase 0 matrix. */
const EXPORT_PERMISSION: Record<ExportScope, Permission> = {
  CASES: 'case:export',
  CLIENTS: 'client:export',
  RECEIPTS: 'finance:export',
  EXPENSES: 'finance:export',
};

/**
 * Saved searches and export for a list screen.
 *
 * What gets saved is the current URL query string, verbatim. Because the list
 * screens keep their entire filter state there (Phase 6), restoring a saved
 * search is restoring a URL — which is exactly why "a saved search reproduces
 * its exact result set later" holds without any stored schema to migrate.
 */
export function SavedSearchBar({
  scope,
  exportScope,
  basePath,
}: {
  scope: SavedSearchScope;
  exportScope: ExportScope;
  basePath: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [saveOpen, setSaveOpen] = useState(false);

  const saved = useSavedSearches({ scope });
  const remove = useDeleteSavedSearch();

  const currentQuery = params.toString();
  const hasFilters = currentQuery.length > 0;



  return (
    <div className="space-y-2">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        {(saved.data ?? []).map((item) => {
          const active = item.query === currentQuery;
          return (
            <span
              key={item.id}
              className={cn(
                'group flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-sunken',
              )}
            >
              <button
                type="button"
                onClick={() => router.replace(`${basePath}?${item.query}`, { scroll: false })}
                className="flex items-center gap-1"
              >
                {item.isShared ? (
                  <Users className="size-3" aria-label="Shared with office" />
                ) : (
                  <Bookmark className="size-3" />
                )}
                {item.name}
              </button>

              {item.isMine ? (
                <button
                  type="button"
                  onClick={() => remove.mutate(item.id)}
                  aria-label={`Delete saved search ${item.name}`}
                  className="opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              ) : null}
            </span>
          );
        })}

        <Can permission="savedsearch:create">
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            disabled={!hasFilters}
            title={hasFilters ? undefined : 'Apply filters first'}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-sunken disabled:opacity-40"
          >
            <BookmarkPlus className="size-3.5" />
            Save search
          </button>
        </Can>

        {/* Gated on the permission that matches the scope, not a fixed one —
            an accountant may export receipts without being able to export cases. */}
        <Can permission={EXPORT_PERMISSION[exportScope]}>
          <button
            type="button"
            disabled
            title="CSV export is unavailable in this frontend preview."
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-sunken"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </Can>
      </div>

      <SaveSheet open={saveOpen} onOpenChange={setSaveOpen} scope={scope} query={currentQuery} />
    </div>
  );
}

function SaveSheet({
  open,
  onOpenChange,
  scope,
  query,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: SavedSearchScope;
  query: string;
}) {
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateSavedSearch();

  const submit = async () => {
    setError(null);
    try {
      await create.mutateAsync({ name, scope, query, isShared });
      setName('');
      setIsShared(false);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.messageAr : 'Could not save the search.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Save search"
        description="The current filters will be saved as they are."
      >
        <div className="space-y-4">
          <Field label="Search name" required>
            {(props) => (
              <Input
                {...props}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Urgent enforcement cases"
                autoFocus
              />
            )}
          </Field>

          <Can permission="savedsearch:share">
            <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(event) => setIsShared(event.target.checked)}
                className="mt-0.5 size-4 rounded border-line-strong accent-[rgb(var(--color-brand))]"
              />
              <span>
                Share with office
                <span className="block text-xs text-ink-subtle">
                  Visible to all users. Only you can delete it.
                </span>
              </span>
            </label>
          </Can>

          {error ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <SheetFooter>
            <Button variant="secondary" block onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button block loading={create.isPending} disabled={!name} onClick={() => void submit()}>
              Save
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
