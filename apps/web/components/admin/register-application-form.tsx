'use client';

import { useActionState, useState } from 'react';

import type { ApplicationScope } from '@softmato/db';

import { registerApplicationAction } from '@/app/(admin)/admin/applications/actions';
import { CredentialHandover } from '@/components/admin/credential-handover';
import { ReauthFields } from '@/components/admin/reauth-fields';
import { ScopeCheckboxes } from '@/components/admin/scope-checkboxes';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * One form, one act: the application, its scopes, its webhook address and its
 * domain allowlist are all decided here and committed together.
 *
 * The domains are not a second screen. An application that exists without an
 * allowlist is one that can be pointed anywhere for as long as the gap lasts,
 * and gaps like that are exactly when a half-finished setup gets used.
 */
export function RegisterApplicationForm({
  products,
  scopes,
  defaultScopes,
}: {
  products: { id: string; name: string }[];
  scopes: readonly ApplicationScope[];
  /**
   * Ticked on first render. Uncontrolled, so an admin's edits survive a failed
   * submit the same way the name and domain fields do — this seeds the boxes,
   * it does not keep resetting them.
   */
  defaultScopes: readonly ApplicationScope[];
}) {
  const [state, action] = useActionState(registerApplicationAction, undefined);
  const [isLive, setIsLive] = useState(false);

  if (state?.ok && state.secret) {
    return (
      <CredentialHandover
        secret={state.secret}
        clientId={state.clientId}
        webhookSecret={state.webhookSecret}
        applicationId={state.applicationId}
      />
    );
  }

  return (
    <form action={action} className="mt-6">
      <label className="block text-sm font-medium" htmlFor="app-product">
        Product
      </label>
      <select
        id="app-product"
        name="productId"
        required
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      >
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <FieldError message={state?.fieldErrors?.productId} />

      <label className="mt-4 block text-sm font-medium" htmlFor="app-name">
        Name
      </label>
      <input
        id="app-name"
        name="name"
        required
        placeholder="QuestionCall production"
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <FieldError message={state?.fieldErrors?.name} />

      <label className="mt-6 block text-sm font-medium" htmlFor="app-domains">
        Domains
      </label>
      <textarea
        id="app-domains"
        name="domains"
        required
        rows={4}
        placeholder={
          'questioncall.com\napp.questioncall.com\napi.questioncall.com'
        }
        aria-describedby="app-domains-help"
        className="mt-1 w-full rounded-md border border-input px-3 py-2 font-mono text-sm"
      />
      <p id="app-domains-help" className="mt-1 text-xs text-muted-foreground">
        One per line. Bare hostnames — no{' '}
        <code className="font-mono">https://</code>, no port, no path.{' '}
        <strong>No wildcards:</strong> a subdomain is a different host and needs
        its own line. Over-list rather than be locked out on launch day;
        removing one later takes a second.
      </p>
      <FieldError message={state?.fieldErrors?.domains} />

      <label className="mt-6 block text-sm font-medium" htmlFor="app-webhook">
        Webhook URL <span className="font-normal">(optional)</span>
      </label>
      <input
        id="app-webhook"
        name="webhookUrl"
        type="url"
        placeholder="https://api.questioncall.com/webhooks/softmato"
        aria-describedby="app-webhook-help"
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <p id="app-webhook-help" className="mt-1 text-xs text-muted-foreground">
        Signed payment events are posted here. Its hostname must be one of the
        domains above — this URL is fetched by our server, so an address we have
        not been told to trust is not one we will call. A signing secret is
        generated with the application and shown once, on the next screen.
      </p>
      <FieldError message={state?.fieldErrors?.webhookUrl} />

      <ScopeCheckboxes
        available={scopes}
        selected={defaultScopes}
        error={state?.fieldErrors?.scopes}
      />

      {/*
       * Hidden 'false' first, same reason as the settings form: an unchecked
       * box sends nothing, and "nothing" must not read as "live".
       */}
      <input type="hidden" name="isLive" value="false" />
      <label className="mt-6 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="isLive"
          value="true"
          checked={isLive}
          onChange={(event) => setIsLive(event.target.checked)}
          className="size-4 rounded-sm border-input"
        />
        Live credential
        <span className="text-xs font-normal text-muted-foreground">
          leave off for a sandbox integration
        </span>
      </label>

      {/*
       * Only for a live credential. A sandbox one touches no real money and is
       * deliberately cheap to make; minting one that can move money is in the
       * same class as changing an admin password.
       */}
      {isLive ? (
        <div className="mt-4 rounded-md border border-border p-4">
          <p className="text-sm font-medium">Confirm it is you</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This credential can collect real payments. A session alone is not
            enough to mint one.
          </p>
          <ReauthFields
            idPrefix="register"
            error={state?.fieldErrors?.password}
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SubmitButton>Register application</SubmitButton>

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

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}
