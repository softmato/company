'use client';

import { useActionState } from 'react';

import {
  addDomainAction,
  removeDomainAction,
} from '@/app/(admin)/admin/applications/domain-actions';
import { SubmitButton } from '@/components/admin/submit-button';

export interface DomainRow {
  id: number;
  hostname: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

/**
 * The allowlist for one **credential**.
 *
 * Sandbox and Production have separate lists on purpose: a test credential
 * that could send a customer to the production site is the confusion this
 * table exists to prevent. `applicationId` is carried only so the action can
 * revalidate the page this was submitted from.
 *
 * Each row removes itself through its own form, so removing the third domain
 * cannot submit the second — the same one-form-per-verb rule the credential
 * panel follows, for the same reason.
 */
export function DomainList({
  applicationId,
  credentialId,
  domains,
  readOnly,
}: {
  applicationId: number;
  credentialId: number;
  domains: DomainRow[];
  readOnly: boolean;
}) {
  return (
    <div className="mt-4">
      {domains.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No domains registered.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {domains.map((domain) => (
            <li
              key={domain.id}
              className="flex flex-wrap items-baseline justify-between gap-3 p-3"
            >
              <div>
                <code className="font-mono text-sm">{domain.hostname}</code>
                {domain.note ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {domain.note}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Added {domain.createdAt.slice(0, 10)}
                  {domain.createdBy ? ` by admin ${domain.createdBy}` : ''}
                </p>
              </div>

              {readOnly ? null : (
                <RemoveDomainForm
                  applicationId={applicationId}
                  domainId={domain.id}
                  hostname={domain.hostname}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {readOnly ? null : (
        <AddDomainForm
          applicationId={applicationId}
          credentialId={credentialId}
        />
      )}
    </div>
  );
}

function AddDomainForm({
  applicationId,
  credentialId,
}: {
  applicationId: number;
  credentialId: number;
}) {
  const [state, action] = useActionState(addDomainAction, undefined);

  return (
    <form action={action} className="mt-4 rounded-md border border-border p-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="credentialId" value={credentialId} />

      <label
        className="block text-sm font-medium"
        htmlFor={`hostname-${credentialId}`}
      >
        Add a domain
      </label>
      <input
        id={`hostname-${credentialId}`}
        name="hostname"
        required
        placeholder="questioncall.com"
        aria-describedby={`hostname-help-${credentialId}`}
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <p
        id={`hostname-help-${credentialId}`}
        className="mt-1 text-xs text-muted-foreground"
      >
        The bare hostname — no <code className="font-mono">https://</code>, no
        port, no path.
      </p>
      {state?.fieldErrors?.hostname ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.fieldErrors.hostname}
        </p>
      ) : null}

      <label
        className="mt-4 block text-sm font-medium"
        htmlFor={`note-${credentialId}`}
      >
        Note <span className="font-normal">(optional)</span>
      </label>
      <input
        id={`note-${credentialId}`}
        name="note"
        placeholder="Marketing site — return URL only"
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Why it is on the list, for whoever reads this in a year.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Add domain</SubmitButton>

        {state?.message ? (
          <p
            role="status"
            className={`text-sm ${state.ok ? 'text-muted-foreground' : 'text-destructive'}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function RemoveDomainForm({
  applicationId,
  domainId,
  hostname,
}: {
  applicationId: number;
  domainId: number;
  hostname: string;
}) {
  const [state, action] = useActionState(removeDomainAction, undefined);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        /*
         * Removing the host a live product returns to breaks its checkout
         * hand-back on the next payment, with no error anywhere until a
         * customer is standing in front of it. Worth one confirmation.
         */
        if (
          !confirm(
            `Remove ${hostname}? Customers can no longer be returned to it, and webhooks to it stop being accepted.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="domainId" value={domainId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <SubmitButton variant="secondary">Remove</SubmitButton>

      {state?.message && !state.ok ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
