'use client';

import { useActionState, useState, type ReactNode } from 'react';

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
 *   1. **Keys** — every key, what it is worth, and what it is for.
 *   2. **Delivery** — where webhooks go.
 *   3. **Domains** — this credential's own allowlist.
 *   4. **Danger** — reveal, rotate, revoke. Every one of them closed
 *      until it is asked for.
 *
 * Reading is separated from acting, which is the change that made this
 * screen legible. Keys answers "what have I got" without a single form on
 * screen; Danger holds the three acts that change a key, each behind its own
 * button. Before that, every form was open at once and an application with
 * both credentials rendered six password-and-code pairs simultaneously.
 *
 * Each is its own form with its own action state, so rotating a secret cannot
 * accidentally submit an edited webhook URL, and a revoke cannot ride along on
 * a save. On a credential panel, one form per verb is worth the repetition.
 *
 * **The password and code fields appear only on a Production credential.** The
 * decision is made again on the server, from the row rather than from the
 * form — this is which fields to draw, not whether the check runs.
 *
 * **`label` arrives as a prop and is never derived here.** This file is a
 * client component, and `CREDENTIAL_MODE_LABEL` lives in `@softmato/db`,
 * whose entry point re-exports the `pg` client — importing the value would
 * pull `dns`, `net`, `tls` and `fs` into the browser bundle and the page
 * would 500 before rendering a byte. Only `import type` is safe from here.
 * The server page does the lookup and passes the word down.
 */
export function CredentialPanel({
  applicationId,
  applicationName,
  mode,
  label,
  credential,
  domains,
  signingSecret,
}: {
  applicationId: number;
  applicationName: string;
  mode: CredentialMode;
  label: string;
  credential: CredentialSummary | undefined;
  domains: DomainRow[];
  /** Sandbox only, rendered inline. `null` on the Production panel. */
  signingSecret: string | null;
}) {
  const isLive = mode === 'live';

  return (
    <section
      aria-labelledby={`credential-${mode}`}
      className="rounded-md border border-border p-4"
    >
      {/*
       * The heading carries the state and nothing else. The client id used to
       * sit up here, opposite it, which read as a subtitle for the panel when
       * it is really the first fact under Identity — and it left Identity with
       * no heading of its own while the other three blocks had one. Four
       * labelled blocks is the point of this page: an admin should be able to
       * see that there are exactly four kinds of thing here before reading a
       * word of them.
       */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`credential-${mode}`} className="text-lg font-medium">
          {label}
        </h2>

        {credential?.revokedAt ? (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
            revoked
          </span>
        ) : null}
      </div>

      {isLive ? null : <SandboxNote />}

      {credential ? (
        <>
          <Keys
            credential={credential}
            isLive={isLive}
            signingSecret={signingSecret}
          />

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
      <code className="font-mono">PAYMENT_MODE</code>, is the only thing that
      actually keeps a payment from being real.
    </p>
  );
}

/**
 * Every key this credential has, what it is worth, and what it is for.
 *
 * Asked for in these words: "we gotta list clean and clear how many keys we
 * serve super clean, also mention on the right side which key is used for what
 * in simple short."
 *
 * The count is stated rather than left to be inferred from the rows, because
 * the question an admin actually arrives with is "how many secrets are live
 * for this integration" and counting boxes on a screen is not an answer.
 *
 * **The direction of each key is the thing worth saying.** Two of the three
 * are secrets, they are not interchangeable, and the mistake that gets made is
 * sending one where the other belongs. So the right-hand column leads with who
 * sends what to whom — *Your server → us*, *Us → your server* — before it says
 * anything else. `webhook-secret.ts` calls that asymmetry "the thing most
 * likely to be misunderstood by whoever is wiring up the integration"; this is
 * that sentence, on the screen, next to the key it is about.
 */
function Keys({
  credential,
  isLive,
  signingSecret,
}: {
  credential: CredentialSummary;
  isLive: boolean;
  signingSecret: string | null;
}) {
  const overlapOpen =
    credential.previousSecretExpiresAt !== null &&
    credential.previousSecretExpiresAt > new Date();

  const secrets = credential.hasWebhookSecret ? 2 : 1;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">Keys</h3>
        <span className="text-xs text-muted-foreground">
          {secrets === 2 ? 'two secrets' : 'one secret'} · one public id
        </span>
      </div>

      <dl className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
        <KeyRow
          name="Client id"
          purpose="Public. Names this application in our logs and in a support thread. Not a secret — it is in every request already."
          value={
            <span className="font-mono break-all">{credential.clientId}</span>
          }
        />

        <KeyRow
          name="Client secret"
          purpose="Your server → us. Sent as a Bearer token on every API call, and it is the whole proof that the call is yours."
          value={
            <>
              <span className="font-mono">…{credential.secretLast4}</span>
              <span className="text-muted-foreground">
                {' '}
                — stored as an argon2id hash, so it cannot be shown again, here
                or anywhere.{' '}
                {isLive
                  ? 'A lost one is rotated; the old one keeps working for 24 hours.'
                  : 'A lost one is rotated, and a Sandbox rotation asks for nothing.'}
              </span>
            </>
          }
        />

        {credential.hasWebhookSecret ? (
          <KeyRow
            name="Signing secret"
            purpose="Us → your server. We sign every webhook with it; your server checks the signature over the raw body before reading a field."
            value={
              isLive ? (
                <span className="text-muted-foreground">
                  Hidden. Production keys are revealed one at a time, under
                  Danger, and the read is recorded.
                </span>
              ) : (
                <span className="font-mono break-all select-all">
                  {signingSecret ?? '—'}
                </span>
              )
            }
          />
        ) : null}
      </dl>

      <p className="mt-2 text-xs text-muted-foreground">
        Created {credential.createdAt.toISOString().slice(0, 10)}
        {credential.rotatedAt
          ? ` · last rotated ${credential.rotatedAt.toISOString().slice(0, 10)}`
          : null}
      </p>

      {overlapOpen ? (
        <p className="mt-2 text-xs text-muted-foreground">
          The superseded client secret (…{credential.previousSecretLast4}) still
          works until {credential.previousSecretExpiresAt?.toUTCString()}.
        </p>
      ) : null}
    </div>
  );
}

/**
 * One key: what it is on the left, what it is for on the right.
 *
 * The two columns are the point. A single column of prose is what the previous
 * screen had, and it made three unlike things — a public identifier, a secret
 * that cannot be read back, and a secret that can — look like three rows of
 * the same table.
 */
function KeyRow({
  name,
  value,
  purpose,
}: {
  name: string;
  value: ReactNode;
  purpose: string;
}) {
  return (
    <div className="grid gap-x-6 gap-y-1 p-3 text-xs sm:grid-cols-[1fr_minmax(0,15rem)]">
      <div className="min-w-0">
        <dt className="font-medium">{name}</dt>
        <dd className="mt-1 break-all">{value}</dd>
      </div>

      <dd className="text-muted-foreground sm:border-l sm:border-border sm:pl-4">
        {purpose}
      </dd>
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
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-sm font-medium">Delivery</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Where signed payment events are posted. The key they are signed with is
        under Keys.
      </p>

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
          autoComplete="url"
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

      {credential.hasWebhookSecret ? null : (
        <p className="mt-3 text-xs text-muted-foreground">
          This credential has no signing secret, so nothing can be delivered.
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
    <div className="mt-5 border-t border-border pt-4">
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
  const hasWebhookSecret = credential.hasWebhookSecret;

  return (
    <div className="mt-8 space-y-3 border-t-2 border-destructive/30 pt-4">
      <h3 className="text-sm font-medium text-destructive">Danger</h3>
      <p className="text-xs text-muted-foreground">
        Every one of these is felt by the integrator, and the last cannot be
        undone. Each opens on its own; nothing here is armed until it is.
      </p>

      {isLive && hasWebhookSecret ? (
        <Collapsible
          title="Reveal the signing secret"
          description="Production only — the Sandbox key is printed under Keys. Reading this one is recorded against your account."
          action="Reveal"
        >
          <RevealForm credentialId={credential.id} isLive={isLive} />
        </Collapsible>
      ) : null}

      {hasWebhookSecret ? (
        <Collapsible
          title="Rotate the signing secret"
          description="No overlap period. Deliveries fail from the moment this returns until the consumer is redeployed with the new value."
          action="Rotate"
        >
          <RotateWebhookForm credentialId={credential.id} isLive={isLive} />
        </Collapsible>
      ) : null}

      <Collapsible
        title="Rotate the client secret"
        description="The superseded secret keeps working for 24 hours, then stops. The integration has that long to redeploy."
        action="Rotate secret"
      >
        <RotateSecretForm credential={credential} isLive={isLive} />
      </Collapsible>

      <Collapsible
        title="Revoke this credential"
        description="Immediate, and it cannot be undone. This credential’s secrets stop working at once — there is no overlap — and bringing it back means a new credential with a new client id. The other credential is not affected."
        action="Revoke"
        tone="danger"
      >
        <RevokeForm
          applicationName={applicationName}
          credential={credential}
          isLive={isLive}
        />
      </Collapsible>
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
    <form action={action} className="mt-5 border-t border-border pt-4">
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
    <form action={action}>
      <input type="hidden" name="credentialId" value={credential.id} />

      {isLive ? (
        <ReauthFields
          idPrefix={`rotate-${credential.id}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
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
    <form action={action}>
      <input type="hidden" name="credentialId" value={credential.id} />

      <label
        className="block text-xs font-medium"
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
    <form action={action}>
      <input type="hidden" name="credentialId" value={credentialId} />

      {isLive ? (
        <ReauthFields
          idPrefix={`reveal-${credentialId}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
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

  /*
   * No overlap, unlike a client secret rotation: two valid keys would mean a
   * consumer that accepts a signature from the key we meant to retire.
   * Deliveries fail from the moment this returns until the consumer is
   * redeployed. `Collapsible` carries that sentence now.
   */
  return (
    <form action={action}>
      <input type="hidden" name="credentialId" value={credentialId} />

      {isLive ? (
        <ReauthFields
          idPrefix={`rotate-webhook-${credentialId}`}
          error={state?.fieldErrors?.password}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
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

/**
 * One action, closed until it is wanted.
 *
 * The screen this replaces rendered every form expanded at once. On an
 * application holding both credentials that was about ten forms in one
 * column and — because each Production action carries its own password and
 * authenticator fields — **six** "Your password / Authenticator code" pairs
 * visible simultaneously, which reads as six different passwords rather than
 * one asked for six times. The founder's word for the result was
 * "confusing", and it was the accurate one.
 *
 * Closed, an action is a sentence and a button. Open, it is the same form as
 * before. At most one password pair is on screen at a time in normal use.
 *
 * **It never closes itself.** A rotation's one-time secret and a reveal's key
 * are rendered by the form inside, so auto-closing on success would throw
 * away the only copy the admin will ever see. Cancel is the only thing that
 * unmounts it — which doubles as the way to clear a revealed secret off the
 * screen.
 */
function Collapsible({
  title,
  description,
  action,
  tone = 'neutral',
  children,
}: {
  title: string;
  description: string;
  action: string;
  tone?: 'neutral' | 'danger';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const danger = tone === 'danger';

  return (
    <div
      className={`rounded-md border p-4 ${
        danger
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-border bg-background'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${danger ? 'text-destructive' : ''}`}
          >
            {title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium ${
            danger
              ? 'border-destructive/50 text-destructive hover:bg-destructive/10'
              : 'border-input hover:bg-muted'
          }`}
        >
          {open ? 'Cancel' : action}
        </button>
      </div>

      {open ? (
        <div className="mt-4 border-t border-border/60 pt-4">{children}</div>
      ) : null}
    </div>
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
