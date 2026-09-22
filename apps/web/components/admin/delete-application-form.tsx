'use client';

import { useActionState } from 'react';

import { deleteApplicationAction } from '@/app/(admin)/admin/applications/actions';
import { Collapsible, Status } from '@/components/admin/credential-panel';
import { ReauthFields } from '@/components/admin/reauth-fields';
import { SubmitButton } from '@/components/admin/submit-button';

/** Deleting an application that never moved money. One with history is refused. */
export function DeleteApplicationForm({
  applicationId,
  applicationName,
}: {
  applicationId: number;
  applicationName: string;
}) {
  const [state, action] = useActionState(deleteApplicationAction, undefined);

  return (
    <div className="mt-8">
      <Collapsible
        title="Delete this application"
        description="For a test or duplicate registration that never moved money. Its credentials and domains go with it, and it cannot be undone. An application with any payment history is refused — revoke its credentials instead."
        action="Delete"
        tone="danger"
      >
        <form action={action}>
          <input type="hidden" name="applicationId" value={applicationId} />

          <label className="block text-xs font-medium" htmlFor="delete-name">
            Type <span className="font-mono">{applicationName}</span> to confirm
          </label>
          <input
            id="delete-name"
            name="confirmName"
            type="text"
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          />
          {state?.fieldErrors?.confirmName ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {state.fieldErrors.confirmName}
            </p>
          ) : null}

          <ReauthFields
            idPrefix="delete-application"
            error={state?.fieldErrors?.password}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SubmitButton variant="secondary">Delete application</SubmitButton>
            <Status state={state} />
          </div>
        </form>
      </Collapsible>
    </div>
  );
}
