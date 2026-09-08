'use client';

import { useActionState } from 'react';

import type { ApplicationScope } from '@softmato/db';

import { registerApplicationAction } from '@/app/(admin)/admin/applications/actions';
import { CredentialHandover } from '@/components/admin/credential-handover';
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
       * No mode is chosen here any more. Registration mints Sandbox, always,
       * and Production is minted afterwards from the application's own page
       * with a password and a code.
       *
       * The checkbox that used to sit here was the one-row model showing
       * through — an application *was* a mode. It is also the safer default
       * gone missing: a box on a form being filled in for the first time is
       * the easiest way to create a production credential by accident, and
       * the hardest place to notice you have.
       */}

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
