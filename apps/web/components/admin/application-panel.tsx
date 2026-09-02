'use client';

import { useActionState } from 'react';

import type { ApplicationScope } from '@softmato/db';

import {
  revokeApplicationAction,
  rotateSecretAction,
  updateApplicationAction,
} from '@/app/(admin)/admin/applications/actions';
import type { ApplicationSummary } from '@/lib/applications/queries';
import { ScopeCheckboxes } from '@/components/admin/scope-checkboxes';
import { SecretReveal } from '@/components/admin/secret-reveal';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * One registered application: what it is, what it may do, and the three things
 * that can be done to it.
 *
 * Each is its own form with its own action state, so rotating a secret cannot
 * accidentally submit an edited scope list, and a revoke cannot ride along on
 * a save. On a credential panel, one form per verb is worth the repetition.
 */
export function ApplicationPanel({
  application,
  scopes,
}: {
  application: ApplicationSummary;
  scopes: readonly ApplicationScope[];
}) {
  const overlapOpen =
    application.previousSecretExpiresAt !== null &&
    application.previousSecretExpiresAt > new Date();

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          {application.name}{' '}
          <span
            className={`ml-1 rounded px-1.5 py-0.5 text-xs ${
              application.isLive
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {application.isLive ? 'live' : 'test'}
          </span>
          {application.revokedAt ? (
            <span className="ml-1 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
              revoked
            </span>
          ) : null}
        </h3>

        <code className="font-mono text-xs text-muted-foreground">
          {application.clientId}
        </code>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <div>
          <dt className="inline">Secret ends </dt>
          <dd className="inline font-mono">…{application.secretLast4}</dd>
        </div>
        <div>
          <dt className="inline">Webhook signing secret </dt>
          <dd className="inline">
            {application.hasWebhookSecret ? 'set' : 'none'}
          </dd>
        </div>
        {application.rotatedAt ? (
          <div className="col-span-2">
            <dt className="inline">Last rotated </dt>
            <dd className="inline">
              {application.rotatedAt.toISOString().slice(0, 10)}
            </dd>
          </div>
        ) : null}
      </dl>

      {overlapOpen ? (
        <p className="mt-2 text-xs text-muted-foreground">
          The superseded secret (…{application.previousSecretLast4}) still works
          until {application.previousSecretExpiresAt?.toUTCString()}.
        </p>
      ) : null}

      {application.revokedAt ? null : (
        <>
          <EditForm application={application} scopes={scopes} />
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <RotateForm applicationId={application.id} />
            <RevokeForm applicationId={application.id} />
          </div>
        </>
      )}
    </div>
  );
}

function EditForm({
  application,
  scopes,
}: {
  application: ApplicationSummary;
  scopes: readonly ApplicationScope[];
}) {
  const [state, action] = useActionState(updateApplicationAction, undefined);

  return (
    <form action={action} className="mt-4 border-t border-border pt-4">
      <input type="hidden" name="applicationId" value={application.id} />

      <label
        className="block text-sm font-medium"
        htmlFor={`webhook-${application.id}`}
      >
        Webhook URL
      </label>
      <input
        id={`webhook-${application.id}`}
        name="webhookUrl"
        type="url"
        defaultValue={application.webhookUrl ?? ''}
        aria-describedby={`webhook-help-${application.id}`}
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <p
        id={`webhook-help-${application.id}`}
        className="mt-1 text-xs text-muted-foreground"
      >
        Its hostname must be one of the registered domains below. This URL is
        fetched by our own server, so an address we have not been told to trust
        is not one we will call.
      </p>
      {state?.fieldErrors?.webhookUrl ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.fieldErrors.webhookUrl}
        </p>
      ) : null}

      <ScopeCheckboxes
        available={scopes}
        selected={application.scopes}
        error={state?.fieldErrors?.scopes}
      />

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

function RotateForm({ applicationId }: { applicationId: number }) {
  const [state, action] = useActionState(rotateSecretAction, undefined);

  return (
    <form action={action} className="contents">
      <input type="hidden" name="applicationId" value={applicationId} />
      <SubmitButton variant="secondary">Rotate secret</SubmitButton>

      {state?.message ? (
        <p
          role="status"
          className={`text-sm ${state.ok ? 'text-muted-foreground' : 'text-destructive'}`}
        >
          {state.message}
        </p>
      ) : null}

      {state?.ok && state.secret ? (
        <div className="w-full">
          <SecretReveal
            secret={state.secret}
            clientId={state.clientId}
            previousSecretExpiresAt={state.previousSecretExpiresAt}
          />
        </div>
      ) : null}
    </form>
  );
}

function RevokeForm({ applicationId }: { applicationId: number }) {
  const [state, action] = useActionState(revokeApplicationAction, undefined);

  return (
    <form
      action={action}
      className="contents"
      onSubmit={(event) => {
        // Revocation is immediate and cannot be undone by re-enabling; a new
        // application has to be registered. Worth one confirmation.
        if (!confirm('Revoke this application? Every secret stops working.')) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <SubmitButton variant="secondary">Revoke</SubmitButton>

      {state?.message ? (
        <p
          role="status"
          className={`text-sm ${state.ok ? 'text-muted-foreground' : 'text-destructive'}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
