'use client';

import { useActionState } from 'react';

import type { CredentialMode } from '@softmato/db';

import {
  addCredentialAction,
  revokeCredentialAction,
  rotateSecretAction,
  rotateWebhookSecretAction,
  revealWebhookSecretAction,
  setWebhookUrlAction,
} from '@/app/(admin)/admin/applications/actions';
import type { CredentialSummary } from '@/lib/applications/queries';
import type { DomainRow } from '@/components/admin/domain-list';
import { DomainList } from '@/components/admin/domain-list';
import { ReauthFields } from '@/components/admin/reauth-fields';
import { SecretReveal } from '@/components/admin/secret-reveal';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * One credential set, and everything that can be done to it.
 *
 * Four kinds of thing live here and they are separated on purpose, because the
 * screen this replaces put them in one flat column with identical visual
 * weight — read-only facts, routine settings, secret disclosure, and
 * irreversible destruction, with "Rotate secret" and "Revoke" side by side as
 * two grey buttons and no confirmation on either.
 *
 *   1. **Identity** — client id, the last four of the secret, dates.
 *   2. **Delivery** — webhook URL and signing secret.
 *   3. **Domains** — this credential's own allowlist.
 *   4. **Danger** — rotate, revoke. Separated, and destructive-looking.
 *
 * Each is its own form with its own action state, so rotating a secret cannot
 * accidentally submit an edited webhook URL, and a revoke cannot ride along on
 * a save. On a credential panel, one form per verb is worth the repetition.
 *
 * **The password and code fields appear only on a Production credential.** The
 * decision is made again on the server, from the row rather than from the
 * form — this is which fields to draw, not whether the check runs.
 */
export function CredentialPanel({
  applicationId,
  applicationName,
  mode,
  credential,
  domains,
}: {
  applicationId: number;
  applicationName: string;
  mode: CredentialMode;
  credential: CredentialSummary | undefined;
  domains: DomainRow[];
}) {
  const isLive = mode === 'live';
  const label = isLive ? 'Production' : 'Sandbox';

  return (
    <section
      aria-labelledby={`credential-${mode}`}
      className="rounded-md border border-border p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`credential-${mode}`} className="text-lg font-medium">
          {label}
          {credential?.revokedAt ? (
            <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
              revoked
            </span>
          ) : null}
        </h2>

        {credential ? (
          <code className="font-mono text-xs text-muted-foreground">
            {credential.clientId}
          </code>
        ) : null}
      </div>

      {isLive ? null : <SandboxNote />}

      {credential ? (
        <>
          <Identity credential={credential} />

          {credential.revokedAt ? null : (
            <>
              <Delivery
                credential={credential}
                isLive={isLive}
                hasDomains={domains.length > 0}
              />

              <Domains
                applicationId={applicationId}
                credentialId={credential.id}
                domains={domains}
                label={label}
              />

              <Danger
                applicationName={applicationName}
                credential={credential}
                isLive={isLive}
              />
            </>
          )}
        </>
      ) : (
        <CreateForm
          applicationId={applicationId}
          mode={mode}
          label={label}
          isLive={isLive}
        />
      )}
    </section>
  );
}

/**
 * What a Sandbox credential actually is.
 *
 * `mode` picks the `app_test_` and `cs_test_` prefixes and nothing else. It
 * does not choose a payment provider, does not change which gateway is called,
 * and does not keep anything out of the ledger — `PAYMENT_MODE` decides that,
 * and it is deployment-wide.
 *
 * So this paragraph is not a disclaimer to be softened. A prominent Sandbox
 * badge above a credential that takes real money on the production deployment
 * is worse than no badge at all.
 */
function SandboxNote() {
  return (
    <p className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      A Sandbox credential is for use against a{' '}
      <strong className="font-medium">non-production deployment</strong>. It is
      a label on the identifier, not an isolation boundary: used against
      production it reaches the real gateways, takes real money and posts real
      journal entries. The preview deployment, with its own database and its own{' '}
      <code className="font-mono">PAYMENT_MODE</code>, is what actually
      separates test money from real money.
    </p>
  );
}

function Identity({ credential }: { credential: CredentialSummary }) {
  const overlapOpen =
    credential.previousSecretExpiresAt !== null &&
    credential.previousSecretExpiresAt > new Date();

  return (
    <div className="mt-4 border-t border-border pt-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <div>
          <dt className="inline">Secret ends </dt>
          <dd className="inline font-mono">…{credential.secretLast4}</dd>
        </div>
        <div>
          <dt className="inline">Signing secret </dt>
          <dd className="inline">
            {credential.hasWebhookSecret ? 'set' : 'none'}
          </dd>
        </div>
        <div>
          <dt className="inline">Created </dt>
          <dd className="inline">
            {credential.createdAt.toISOString().slice(0, 10)}
          </dd>
        </div>
        {credential.rotatedAt ? (
          <div>
            <dt className="inline">Last rotated </dt>
            <dd className="inline">
              {credential.rotatedAt.toISOString().slice(0, 10)}
            </dd>
          </div>
        ) : null}
      </dl>

      {/*
       * The sentence that did not exist anywhere on the old screen, and is the
       * one an admin needs before they go looking for a secret they cannot
       * find. `secret_hash` is argon2id: there is no query that produces the
       * plaintext again.
       */}
      <p className="mt-2 text-xs text-muted-foreground">
        The client secret cannot be shown again. If it is lost, rotate it.
      </p>

      {overlapOpen ? (
        <p className="mt-2 text-xs text-muted-foreground">
          The superseded secret (…{credential.previousSecretLast4}) still works
          until {credential.previousSecretExpiresAt?.toUTCString()}.
        </p>
      ) : null}
    </div>
  );
}

function Delivery({
  credential,
  isLive,
  hasDomains,
}: {
  credential: CredentialSummary;
  isLive: boolean;
  hasDomains: boolean;
}) {
  const [state, action] = useActionState(setWebhookUrlAction, undefined);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="text-sm font-medium">Delivery</h3>

      <form action={action} className="mt-3">
        <input type="hidden" name="credentialId" value={credential.id} />

        <label
          className="block text-xs font-medium"
          htmlFor={`webhook-${credential.id}`}
        >
          Webhook URL
        </label>
        <input
          id={`webhook-${credential.id}`}
          name="webhookUrl"
          type="url"
          defaultValue={credential.webhookUrl ?? ''}
          aria-describedby={`webhook-help-${credential.id}`}
          className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
        />
        <p
          id={`webhook-help-${credential.id}`}
          className="mt-1 text-xs text-muted-foreground"
        >
          Its hostname must be one of this credential&rsquo;s registered domains
          below. This URL is fetched by our own server, so an address we have
          not been told to trust is not one we will call.
          {hasDomains ? null : ' No domains are registered yet.'}
        </p>
        {state?.fieldErrors?.webhookUrl ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {state.fieldErrors.webhookUrl}
          </p>
        ) : null}

        {isLive ? (
          <ReauthFields
            idPrefix={`webhook-url-${credential.id}`}
            error={state?.fieldErrors?.password}
          />
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <SubmitButton variant="secondary">Save webhook URL</SubmitButton>
          <Status state={state} />
        </div>
      </form>

      {credential.hasWebhookSecret ? (
        <div className="mt-4 space-y-3">
          <RevealForm credentialId={credential.id} isLive={isLive} />
          <RotateWebhookForm credentialId={credential.id} isLive={isLive} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          This credential has no signing secret.
        </p>
      )}
    </div>
  );
}

function Domains({
  applicationId,
  credentialId,
  domains,
  label,
}: {
  applicationId: number;
  credentialId: number;
  domains: DomainRow[];
  label: string;
}) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="text-sm font-medium">Domains</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Exact hostnames, no wildcards. A subdomain is a different host and needs
        its own entry. This list is {label}&rsquo;s alone — the other credential
        has its own.
      </p>

      <DomainList
        applicationId={applicationId}
        credentialId={credentialId}
        domains={domains}
        readOnly={false}
      />
    </div>
  );
}

function Danger({
  applicationName,
  credential,
  isLive,
}: {
  applicationName: string;
  credential: CredentialSummary;
  isLive: boolean;
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <RotateSecretForm credential={credential} isLive={isLive} />
      <RevokeForm
        applicationName={applicationName}
        credential={credential}
        isLive={isLive}
      />
    </div>
  );
}

function CreateForm({
  applicationId,
  mode,
  label,
  isLive,
}: {
  applicationId: number;
  mode: CredentialMode;
  label: string;
  isLive: boolean;
}) {
  const [state, action] = useActionState(addCredentialAction, undefined);

  return (
    <form action={action} className="mt-4 border-t border-border pt-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="mode" value={mode} />

      <p className="text-sm text-muted-foreground">
        No {label} credential yet. Creating one issues a client id and a secret
        of its own; the other credential is untouched.
      </p>

      {isLive ? (
        <ReauthFields
          idPrefix={`create-${mode}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">
          Create {label} credential
        </SubmitButton>
        <Status state={state} />
      </div>

      {state?.ok && state.secret ? (
        <SecretReveal secret={state.secret} clientId={state.clientId} />
      ) : null}
    </form>
  );
}

function RotateSecretForm({
  credential,
  isLive,
}: {
  credential: CredentialSummary;
  isLive: boolean;
}) {
  const [state, action] = useActionState(rotateSecretAction, undefined);

  return (
    <form action={action} className="rounded-md border border-border p-4">
      <input type="hidden" name="credentialId" value={credential.id} />

      <p className="text-sm font-medium">Rotate the client secret</p>
      <p className="mt-1 text-xs text-muted-foreground">
        The superseded secret keeps working for 24 hours, then stops. The
        integration has that long to redeploy.
      </p>

      {isLive ? (
        <ReauthFields
          idPrefix={`rotate-${credential.id}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Rotate secret</SubmitButton>
        <Status state={state} />
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
 * The `confirm()` dialog this replaces asked a yes/no question about a
 * credential it could not name, on a page that now shows two. A dialog like
 * that is dismissed by reflex; a name has to be read and copied, which is the
 * only part of this that makes revoking the *wrong* credential harder rather
 * than just slower.
 *
 * It is not a second factor and does not stand in for one — on a Production
 * credential the password and code are asked for as well. The server checks
 * both again against the stored row.
 */
function RevokeForm({
  applicationName,
  credential,
  isLive,
}: {
  applicationName: string;
  credential: CredentialSummary;
  isLive: boolean;
}) {
  const [state, action] = useActionState(revokeCredentialAction, undefined);

  return (
    <form
      action={action}
      className="rounded-md border border-destructive/40 bg-destructive/5 p-4"
    >
      <input type="hidden" name="credentialId" value={credential.id} />

      <p className="text-sm font-medium text-destructive">
        Revoke this credential
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Immediate, and it cannot be undone. This credential&rsquo;s secrets stop
        working at once — there is no overlap — and bringing it back means a new
        credential with a new client id. The other credential is not affected.
      </p>

      <label
        className="mt-3 block text-xs font-medium"
        htmlFor={`revoke-name-${credential.id}`}
      >
        Type <span className="font-mono">{applicationName}</span> to confirm
      </label>
      <input
        id={`revoke-name-${credential.id}`}
        name="confirmName"
        type="text"
        autoComplete="off"
        aria-describedby={
          state?.fieldErrors?.confirmName
            ? `revoke-name-error-${credential.id}`
            : undefined
        }
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      {state?.fieldErrors?.confirmName ? (
        <p
          id={`revoke-name-error-${credential.id}`}
          role="alert"
          className="mt-1 text-xs text-destructive"
        >
          {state.fieldErrors.confirmName}
        </p>
      ) : null}

      {isLive ? (
        <ReauthFields
          idPrefix={`revoke-${credential.id}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Revoke</SubmitButton>
        <Status state={state} />
      </div>
    </form>
  );
}

function RevealForm({
  credentialId,
  isLive,
}: {
  credentialId: number;
  isLive: boolean;
}) {
  const [state, action] = useActionState(revealWebhookSecretAction, undefined);

  return (
    <form action={action} className="rounded-md border border-border p-4">
      <input type="hidden" name="credentialId" value={credentialId} />

      <p className="text-sm font-medium">Reveal the signing secret</p>
      <p className="mt-1 text-xs text-muted-foreground">
        The consumer verifies every delivery against this value before reading a
        single field of the body. It is <strong>not</strong> the client secret.
        Reading it is recorded against your account.
      </p>

      {isLive ? (
        <ReauthFields
          idPrefix={`reveal-${credentialId}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Reveal</SubmitButton>
        <Status state={state} />
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

function RotateWebhookForm({
  credentialId,
  isLive,
}: {
  credentialId: number;
  isLive: boolean;
}) {
  const [state, action] = useActionState(rotateWebhookSecretAction, undefined);

  return (
    <form action={action} className="rounded-md border border-border p-4">
      <input type="hidden" name="credentialId" value={credentialId} />

      <p className="text-sm font-medium">Rotate the signing secret</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {/*
         * No overlap, unlike a client secret rotation: two valid keys would
         * mean a consumer that accepts a signature from the key we meant to
         * retire. Deliveries fail from the moment this returns until the
         * consumer is redeployed.
         */}
        No overlap period. Deliveries fail until the consumer is redeployed with
        the new value.
      </p>

      {isLive ? (
        <ReauthFields
          idPrefix={`rotate-webhook-${credentialId}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Rotate</SubmitButton>
        <Status state={state} />
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

function Status({
  state,
}: {
  state: { ok: boolean; message?: string } | undefined;
}) {
  if (!state?.message) return null;

  return (
    <p
      role="status"
      className={`text-sm ${state.ok ? 'text-muted-foreground' : 'text-destructive'}`}
    >
      {state.message}
    </p>
  );
}
