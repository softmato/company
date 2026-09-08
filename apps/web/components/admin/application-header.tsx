'use client';

import { useActionState } from 'react';

import type { ApplicationScope } from '@softmato/db';

import { updateApplicationAction } from '@/app/(admin)/admin/applications/actions';
import type { ApplicationSummary } from '@/lib/applications/queries';
import { ReauthFields } from '@/components/admin/reauth-fields';
import { ScopeCheckboxes } from '@/components/admin/scope-checkboxes';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * The integration itself — the half that is not a credential.
 *
 * Only scopes are editable here. A scope describes what the integration
 * *does*, so it is shared by both credential sets deliberately: it must not
 * silently differ between the credential somebody tested with and the one they
 * went live with, which is a class of bug that only ever surfaces in
 * production on the day it matters.
 *
 * **That sharing is why this is gated by the application, not by a mode.**
 * Narrowing a scope on an application that has a Production credential is a
 * change to a live integration even though this form never mentions modes, so
 * the password and code appear whenever one exists.
 */
export function ApplicationHeader({
  application,
  scopes,
}: {
  application: ApplicationSummary;
  scopes: readonly ApplicationScope[];
}) {
  const [state, action] = useActionState(updateApplicationAction, undefined);

  const hasProduction = application.credentials.some(
    (credential) => credential.mode === 'live' && credential.revokedAt === null,
  );

  return (
    <form action={action} className="rounded-md border border-border p-4">
      <input type="hidden" name="applicationId" value={application.id} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">This integration</h2>
        <span className="text-xs text-muted-foreground">
          {application.isActive ? 'active' : 'inactive'} · registered{' '}
          {application.createdAt.toISOString().slice(0, 10)}
        </span>
      </div>

      <ScopeCheckboxes
        available={scopes}
        selected={application.scopes}
        error={state?.fieldErrors?.scopes}
      />

      <p className="mt-2 text-xs text-muted-foreground">
        Shared by both credentials. A scope should not differ between the
        credential you tested with and the one you went live with.
      </p>

      {hasProduction ? (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            This application has a Production credential, so narrowing a scope
            here can break a live integration — silently, until its next call.
            Confirm it is you.
          </p>
          <ReauthFields
            idPrefix={`app-${application.id}`}
            error={state?.fieldErrors?.password}
          />
        </>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <SubmitButton variant="secondary">Save</SubmitButton>
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
