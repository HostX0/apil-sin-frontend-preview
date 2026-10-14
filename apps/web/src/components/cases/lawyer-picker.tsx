'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@muhami/ui';
import { LawyerFormSheet } from '@/components/lawyers/lawyer-form-sheet';
import { useLawyers } from '@/lib/api/lawyers';
import { useAuth } from '@/lib/auth-context';

type AssignedLawyer = { id: string; fullName: string; isLead: boolean };

export function LawyerPicker({
  value,
  onChange,
  existing = [],
  enabled,
  error,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  existing?: AssignedLawyer[];
  enabled: boolean;
  error?: string;
}) {
  const { can } = useAuth();
  const [addingLawyer, setAddingLawyer] = useState(false);
  const [addedLawyer, setAddedLawyer] = useState<{ id: string; fullName: string } | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const canAssign = can('case:assign');
  const lawyers = useLawyers({}, enabled && canAssign);
  const currentIds = new Set(lawyers.data?.map((lawyer) => lawyer.id) ?? []);
  if (addedLawyer) currentIds.add(addedLawyer.id);
  const unavailable = existing.filter(
    (lawyer) => value.includes(lawyer.id) && !currentIds.has(lawyer.id),
  );
  const candidates = [...(lawyers.data ?? []), ...unavailable];
  if (addedLawyer && !candidates.some((lawyer) => lawyer.id === addedLawyer.id))
    candidates.push({ ...addedLawyer, isLead: false });

  if (!canAssign) {
    return (
      <div className="rounded-md border border-line p-3 text-sm text-ink-muted">
        {existing.length
          ? existing.map((lawyer) => lawyer.fullName).join(', ')
          : 'No lawyer assigned yet.'}
        <p className="mt-1 text-xs text-ink-subtle">
          The office administrator assigns the lawyer responsible for the case.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="case-lead-lawyer" className="block text-sm font-medium text-ink">
        Responsible lawyer <span className="text-danger">*</span>
      </label>
      <select
        id="case-lead-lawyer"
        value={value[0] ?? ''}
        disabled={lawyers.isLoading || lawyers.isError}
        onChange={(event) => {
          const id = event.target.value;
          onChange(id ? [id, ...value.slice(1).filter((selected) => selected !== id)] : []);
        }}
        aria-describedby="case-lawyer-help"
        aria-invalid={Boolean(error) || undefined}
        className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
      >
        <option value="">Choose a lawyer…</option>
        {candidates.map((lawyer) => (
          <option
            key={lawyer.id}
            value={lawyer.id}
            disabled={
              !currentIds.has(lawyer.id) || (value.length >= 10 && !value.includes(lawyer.id))
            }
          >
            {lawyer.fullName}
            {lawyers.isSuccess && !currentIds.has(lawyer.id)
              ? ' — unavailable for new assignments'
              : ''}
          </option>
        ))}
      </select>
      {value.length > 0 && candidates.length > 1 ? (
        <button
          type="button"
          className="min-h-11 text-sm font-medium text-brand"
          aria-expanded={showParticipants}
          onClick={() => setShowParticipants((current) => !current)}
        >
          {showParticipants
            ? 'Hide participating lawyers'
            : value.length > 1
              ? `Participating lawyers (${value.length - 1})`
              : 'Add participating lawyers (optional)'}
        </button>
      ) : null}
      {showParticipants && value.length > 0 && candidates.length > 1 ? (
        <fieldset className="space-y-1 rounded-md border border-line p-3">
          <legend className="px-1 text-xs text-ink-subtle">Participating lawyers (optional)</legend>
          {candidates
            .filter((lawyer) => lawyer.id !== value[0])
            .map((lawyer) => (
              <label key={lawyer.id} className="flex min-h-11 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={value.includes(lawyer.id)}
                  disabled={
                    (!currentIds.has(lawyer.id) && !value.includes(lawyer.id)) ||
                    (!value.includes(lawyer.id) && value.length >= 10)
                  }
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...value, lawyer.id]
                        : value.filter((id) => id !== lawyer.id),
                    )
                  }
                  className="size-4 accent-brand"
                />
                {lawyer.fullName}
                {lawyers.isSuccess && !currentIds.has(lawyer.id)
                  ? ' — unavailable for new assignments'
                  : ''}
              </label>
            ))}
        </fieldset>
      ) : null}
      <p id="case-lawyer-help" className="text-xs text-ink-subtle">
        {lawyers.isLoading
          ? 'Loading lawyers…'
          : lawyers.isSuccess && candidates.length === 0
            ? 'Add a lawyer to the office first, then assign them to the case.'
            : 'Choose who will follow the case. Add participating lawyers if needed.'}
      </p>
      {lawyers.isError ? (
        <button
          type="button"
          onClick={() => void lawyers.refetch()}
          className="text-sm text-danger underline"
        >
          Could not load lawyers. Try again
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Link
        href="/more/lawyers"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open the lawyer directory in a new window"
        className="inline-block text-xs font-medium text-brand hover:underline"
      >
        Open lawyer directory
      </Link>
      {can('user:update') ? (
        <Button type="button" size="sm" variant="secondary" onClick={() => setAddingLawyer(true)}>
          <Plus className="size-4" aria-hidden />
          Add a new lawyer
        </Button>
      ) : null}
      {addingLawyer ? (
        <LawyerFormSheet
          onClose={() => setAddingLawyer(false)}
          onSaved={(lawyer) => {
            setAddedLawyer({ id: lawyer.id, fullName: lawyer.fullName });
            onChange([lawyer.id, ...value.slice(1).filter((id) => id !== lawyer.id)]);
          }}
        />
      ) : null}
    </div>
  );
}
