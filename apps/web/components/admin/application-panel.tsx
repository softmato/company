'use client';

import { useActionState } from 'react';

import type { ApplicationScope } from '@softmato/db';

import {
  revokeApplicationAction,
  rotateSecretAction,
  updateApplicationAction,
} from '@/app/(admin)/admin/applications/actions';
import type { ApplicationSummary } from '@/lib/applications/queries';
import { ReauthFields } from '@/components/admin/reauth-fields';
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
 *
 * **The password and code fields appear only on a Production credential.** The
 * decision is made again on the server, from the row rather than from the
 * form — this is which fields to draw, not whether the check runs. A Sandbox
 * credential is edited, rotated and revoked with no prompt at all.
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

          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <RotateForm application={application} />
            <RevokeForm application={application} />
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

      {application.isLive ? (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            Narrowing a scope or moving the webhook URL on a Production
            credential is silent — nothing fails until the integration&rsquo;s
            next call or next delivery. Confirm it is you.
          </p>
          <ReauthFields
            idPrefix={`edit-${application.id}`}
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

function RotateForm({ application }: { application: ApplicationSummary }) {
  const [state, action] = useActionState(rotateSecretAction, undefined);

  return (
    <form action={action} className="rounded-md border border-border p-4">
      <input type="hidden" name="applicationId" value={application.id} />

      <p className="text-sm font-medium">Rotate the client secret</p>
      <p className="mt-1 text-xs text-muted-foreground">
        The superseded secret keeps working for 24 hours, then stops. The
        integration has that long to redeploy.
      </p>

      {application.isLive ? (
        <ReauthFields
          idPrefix={`rotate-${application.id}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Rotate secret</SubmitButton>

        {state?.message ? (
          <p
            role="status"
            className={`text-sm ${state.ok ? 'text-muted-foreground' : 'text-destructive'}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>

      {state?.ok && state.secret ? (
        <SecretReveal
          secret={state.secret}
          clientId={state.clientId}
          previousSecretExpiresAt={state.previousSecretExpiresAt}
        />
      ) : null}
    </form>
  );
}

/**
 * Revocation, behind the application's own name typed by hand.
 *
 * The `confirm()` dialog this replaces asked a yes/no question about an
 * application it could not name, on a screen that can show several. A dialog
 * like that is dismissed by reflex; a name has to be read off the row above
 * and copied, which is the only part of this that makes revoking the *wrong*
 * application harder rather than just slower.
 *
 * It is not a second factor and does not stand in for one — on a Production
 * credential the password and code are asked for as well. The server checks
 * both again against the stored row.
 */
function RevokeForm({ application }: { application: ApplicationSummary }) {
  const [state, action] = useActionState(revokeApplicationAction, undefined);

  return (
    <form
      action={action}
      className="rounded-md border border-destructive/40 bg-destructive/5 p-4"
    >
      <input type="hidden" name="applicationId" value={application.id} />

      <p className="text-sm font-medium text-destructive">
        Revoke this application
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Immediate, and it cannot be undone. Every secret stops working at once
        — there is no overlap — and bringing the integration back means a new
        registration with a new client id.
      </p>

      <label
        className="mt-3 block text-xs font-medium"
        htmlFor={`revoke-name-${application.id}`}
      >
        Type <span className="font-mono">{application.name}</span> to confirm
      </label>
      <input
        id={`revoke-name-${application.id}`}
        name="confirmName"
        type="text"
        autoComplete="off"
        aria-describedby={
          state?.fieldErrors?.confirmName
            ? `revoke-name-error-${application.id}`
            : undefined
        }
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      {state?.fieldErrors?.confirmName ? (
        <p
          id={`revoke-name-error-${application.id}`}
          role="alert"
          className="mt-1 text-xs text-destructive"
        >
          {state.fieldErrors.confirmName}
        </p>
      ) : null}

      {application.isLive ? (
        <ReauthFields
          idPrefix={`revoke-${application.id}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Revoke</SubmitButton>

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
