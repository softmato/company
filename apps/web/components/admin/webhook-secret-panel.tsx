'use client';

import { useActionState } from 'react';

import {
  revealWebhookSecretAction,
  rotateWebhookSecretAction,
} from '@/app/(admin)/admin/applications/actions';
import { ReauthFields } from '@/components/admin/reauth-fields';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * Reading and replacing the key that signs outbound webhooks.
 *
 * Unlike the client secret, this one *can* be read back — the consumer needs
 * the same bytes we sign with, so it is stored in plaintext. That makes it the
 * one credential on this screen that a reveal can leak, which is why reading
 * it costs a password and a code, and why the read is written to the audit log
 * exactly like the rotation is.
 */
export function WebhookSecretPanel({
  applicationId,
  hasWebhookSecret,
}: {
  applicationId: number;
  hasWebhookSecret: boolean;
}) {
  if (!hasWebhookSecret) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        This application has no signing secret.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        The consumer verifies every delivery against this value before reading a
        single field of the body. It is <strong>not</strong> the client secret
        and does not authenticate anything to us.
      </p>

      <RevealForm applicationId={applicationId} />
      <RotateForm applicationId={applicationId} />
    </div>
  );
}

function RevealForm({ applicationId }: { applicationId: number }) {
  const [state, action] = useActionState(revealWebhookSecretAction, undefined);

  return (
    <form action={action} className="rounded-md border border-border p-4">
      <input type="hidden" name="applicationId" value={applicationId} />

      <p className="text-sm font-medium">Reveal the signing secret</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Reading it is recorded against your account.
      </p>

      <ReauthFields
        idPrefix={`reveal-${applicationId}`}
        error={state?.fieldErrors?.password}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Reveal</SubmitButton>

        {state?.message ? (
          <p
            role="status"
            className={`text-sm ${state.ok ? 'text-muted-foreground' : 'text-destructive'}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>

      {state?.ok && state.webhookSecret ? (
        <dl className="mt-3 rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
          <dt className="text-muted-foreground">Webhook signing secret</dt>
          <dd className="mt-1 font-mono break-all select-all">
            {state.webhookSecret}
          </dd>
        </dl>
      ) : null}
    </form>
  );
}

function RotateForm({ applicationId }: { applicationId: number }) {
  const [state, action] = useActionState(rotateWebhookSecretAction, undefined);

  return (
    <form
      action={action}
      className="rounded-md border border-border p-4"
      onSubmit={(event) => {
        /*
         * There is no overlap on a signing secret, unlike a client secret
         * rotation: two valid keys would mean a consumer that accepts a
         * signature from the key we meant to retire. So deliveries fail from
         * the moment this returns until the consumer is redeployed.
         */
        if (
          !confirm(
            'Rotate the signing secret? Deliveries fail until the consumer is redeployed with the new value — there is no overlap period.',
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />

      <p className="text-sm font-medium">Rotate the signing secret</p>
      <p className="mt-1 text-xs text-muted-foreground">
        No overlap period. Deploy the new value before traffic resumes.
      </p>

      <ReauthFields
        idPrefix={`rotate-webhook-${applicationId}`}
        error={state?.fieldErrors?.password}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Rotate</SubmitButton>

        {state?.message ? (
          <p
            role="status"
            className={`text-sm ${state.ok ? 'text-muted-foreground' : 'text-destructive'}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>

      {state?.ok && state.webhookSecret ? (
        <dl className="mt-3 rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
          <dt className="text-muted-foreground">New signing secret</dt>
          <dd className="mt-1 font-mono break-all select-all">
            {state.webhookSecret}
          </dd>
        </dl>
      ) : null}
    </form>
  );
}
