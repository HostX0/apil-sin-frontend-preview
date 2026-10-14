'use client';

import { uiFieldErrors } from '@/lib/ui-english';

import { useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import {
  TRANSACTION_STATUS_AR,
  TRANSACTION_STATUSES,
  createTransactionSchema,
  toBaghdadDateKey,
  type CreateTransactionInput,
  type TransactionSummary,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useClient, useClientList } from '@/lib/api/clients';
import { ClientFormSheet } from '@/components/clients/client-form-sheet';
import { LawyerFormSheet } from '@/components/lawyers/lawyer-form-sheet';
import { useLawyers } from '@/lib/api/lawyers';
import { useCreateTransaction, useUpdateTransaction } from '@/lib/api/transactions';
import { useAuth } from '@/lib/auth-context';
import { useDebounced } from '@/lib/use-debounced';

const selectClass =
  'h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25';

export function TransactionFormSheet({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TransactionSummary;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={transaction ? 'Update transaction' : 'Add transaction'}
        description={
          transaction
            ? 'Update the status and latest action to follow the transaction.'
            : 'Enter the transaction and department, then choose a client and assigned lawyer.'
        }
      >
        {open ? (
          <TransactionForm
            key={transaction?.id ?? 'new'}
            transaction={transaction}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TransactionForm({
  transaction,
  onClose,
}: {
  transaction?: TransactionSummary;
  onClose: () => void;
}) {
  const { can } = useAuth();
  const admin = can('transaction:create');
  const formRef = useRef<HTMLFormElement>(null);
  const [addingClient, setAddingClient] = useState(false);
  const [addingLawyer, setAddingLawyer] = useState(false);
  const [addedLawyer, setAddedLawyer] = useState<{ id: string; fullName: string } | null>(null);
  const [values, setValues] = useState<CreateTransactionInput>(() => ({
    type: transaction?.type ?? '',
    department: transaction?.department ?? '',
    clientId: transaction?.clientId ?? '',
    addedAt: transaction
      ? toBaghdadDateKey(new Date(transaction.addedAt))
      : toBaghdadDateKey(new Date()),
    assignedLawyerId: transaction?.assignedLawyerId ?? '',
    status: transaction?.status ?? 'IN_PROGRESS',
    notes: transaction?.notes ?? '',
  }));
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 250);
  const clients = useClientList({ search: debounced, limit: 25 }, admin);
  const lawyers = useLawyers({}, admin);
  const rows = clients.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedClient = useClient(values.clientId);
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const change = <K extends keyof CreateTransactionInput>(
    key: K,
    value: CreateTransactionInput[K],
  ) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setErrors({});
    const parsed = createTransactionSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(uiFieldErrors(parsed.error.flatten().fieldErrors));
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    try {
      if (transaction)
        await update.mutateAsync({
          id: transaction.id,
          version: transaction.version,
          ...(admin ? parsed.data : { status: parsed.data.status, notes: parsed.data.notes }),
        });
      else await create.mutateAsync(parsed.data);
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.fieldErrors);
        setError(cause.messageAr);
      } else setError('Could not save the transaction. Try again.');
    }
  };
  return (
    <form ref={formRef} onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
      <fieldset disabled={create.isPending || update.isPending} className="space-y-4">
        {admin ? (
          <>
            <Field label="Transaction type" required error={errors.type?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  value={values.type}
                  onChange={(event) => change('type', event.target.value)}
                  placeholder="Example: Property ownership transfer"
                  autoFocus
                />
              )}
            </Field>
            <Field label="Responsible department" required error={errors.department?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  value={values.department}
                  onChange={(event) => change('department', event.target.value)}
                  placeholder="Example: Real Estate Registration Department"
                />
              )}
            </Field>
            <Field label="Client" required error={errors.clientId?.[0]}>
              {(props) => (
                <div className="space-y-2">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name or mobile number"
                    aria-label="Search for a client"
                  />
                  <select
                    {...props}
                    className={selectClass}
                    value={values.clientId}
                    onChange={(event) => change('clientId', event.target.value)}
                    disabled={clients.isLoading}
                  >
                    <option value="">
                      {clients.isLoading ? 'Loading clients…' : 'Choose client'}
                    </option>
                    {values.clientId && !rows.some((row) => row.id === values.clientId) ? (
                      <option value={values.clientId}>
                        {selectedClient.data?.fullName ??
                          transaction?.clientName ??
                          'Selected client'}
                      </option>
                    ) : null}
                    {rows.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </Field>
            {clients.isError ? (
              <p role="alert" className="text-sm text-danger">
                Could not load clients.{' '}
                <button type="button" className="underline" onClick={() => void clients.refetch()}>
                  Try again
                </button>
              </p>
            ) : null}
            {clients.isSuccess && rows.length === 0 ? (
              <p className="text-xs text-ink-subtle">
                {search
                  ? 'No matching client. Try another search or add a client.'
                  : 'Add the client here to select them for this transaction automatically.'}
              </p>
            ) : null}
            {can('client:create') ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setAddingClient(true)}
              >
                <Plus className="size-4" aria-hidden />
                Add a new client
              </Button>
            ) : null}
            {clients.hasNextPage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={clients.isFetchingNextPage}
                onClick={() => void clients.fetchNextPage()}
              >
                Show more clients
              </Button>
            ) : null}
            <Field label="Added on" required error={errors.addedAt?.[0]}>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={values.addedAt}
                  onChange={(event) => change('addedAt', event.target.value)}
                />
              )}
            </Field>
            <Field label="Assigned lawyer" required error={errors.assignedLawyerId?.[0]}>
              {(props) => (
                <select
                  {...props}
                  className={selectClass}
                  value={values.assignedLawyerId}
                  onChange={(event) => change('assignedLawyerId', event.target.value)}
                  disabled={lawyers.isLoading || lawyers.isError}
                >
                  <option value="">Choose lawyer</option>
                  {values.assignedLawyerId &&
                  !(lawyers.data ?? []).some((row) => row.id === values.assignedLawyerId) ? (
                    <option value={values.assignedLawyerId}>
                      {addedLawyer?.id === values.assignedLawyerId
                        ? addedLawyer.fullName
                        : (transaction?.assignedLawyerName ?? 'Selected lawyer')}
                    </option>
                  ) : null}
                  {(lawyers.data ?? []).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.fullName}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {lawyers.isError ? (
              <p role="alert" className="text-sm text-danger">
                Could not load lawyers.{' '}
                <button type="button" className="underline" onClick={() => void lawyers.refetch()}>
                  Try again
                </button>
              </p>
            ) : null}
            {lawyers.isSuccess && lawyers.data.length === 0 ? (
              <p className="text-xs text-ink-subtle">
                Add an office lawyer to assign them to this transaction.
              </p>
            ) : null}
            {can('user:update') ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setAddingLawyer(true)}
              >
                <Plus className="size-4" aria-hidden />
                Add a new lawyer
              </Button>
            ) : null}
          </>
        ) : (
          <div className="rounded-md bg-surface-sunken p-3 text-sm text-ink">
            {transaction?.type} · {transaction?.clientName}
          </div>
        )}
        <Field label="Transaction status" required>
          {(props) => (
            <select
              {...props}
              className={selectClass}
              value={values.status}
              onChange={(event) =>
                change('status', event.target.value as CreateTransactionInput['status'])
              }
            >
              {TRANSACTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TRANSACTION_STATUS_AR[status]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label="Follow-up details (optional)"
          hint="Enter the latest action, such as submitting papers to the department or the next follow-up date."
          error={errors.notes?.[0]}
        >
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              value={values.notes ?? ''}
              onChange={(event) => change('notes', event.target.value)}
            />
          )}
        </Field>
        {error ? (
          <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <SheetFooter>
          <Button type="button" variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" block loading={create.isPending || update.isPending}>
            {transaction ? 'Save update' : 'Add transaction'}
          </Button>
        </SheetFooter>
      </fieldset>
      <ClientFormSheet
        open={addingClient}
        onOpenChange={setAddingClient}
        onSaved={(client) => {
          change('clientId', client.id);
          setSearch('');
        }}
      />
      {addingLawyer ? (
        <LawyerFormSheet
          onClose={() => setAddingLawyer(false)}
          onSaved={(lawyer) => {
            setAddedLawyer({ id: lawyer.id, fullName: lawyer.fullName });
            change('assignedLawyerId', lawyer.id);
          }}
        />
      ) : null}
    </form>
  );
}
