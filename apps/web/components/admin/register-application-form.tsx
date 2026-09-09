'use client';

import { useActionState, useState } from 'react';

import type { ApplicationScope } from '@softmato/db';

import { registerApplicationAction } from '@/app/(admin)/admin/applications/actions';
import { NEW_PRODUCT } from '@/lib/applications/constants';
import { CredentialHandover } from '@/components/admin/credential-handover';
import { FieldError } from '@/components/admin/field-error';
import {
  ProductField,
  type NewProductDraft,
  type ProductOption,
} from '@/components/admin/product-field';
import { ScopeCheckboxes } from '@/components/admin/scope-checkboxes';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * One form, one act: the application, its scopes, its webhook address and its
 * domain allowlist are all decided here and committed together.
 *
 * The domains are not a second screen. An application that exists without an
 * allowlist is one that can be pointed anywhere for as long as the gap lasts,
 * and gaps like that are exactly when a half-finished setup gets used. Since
 * the product can be created from here too, a whole registration is now one
 * transaction and one screen.
 *
 * ## Every field is controlled, and that is the point
 *
 * This form used to be uncontrolled, with a comment claiming an admin's edits
 * "survive a failed submit". They did not. React resets an uncontrolled
 * `<form action={…}>` once the action settles — pass or fail — so any refusal
 * wiped the name, the whole pasted domain list, the webhook URL and the scope
 * ticks, and left one sentence saying which of them had been wrong. The list
 * is the expensive one: it is the field an admin assembles by hand, and it is
 * also the field most likely to be refused, because one mistyped hostname out
 * of six fails the set.
 *
 * Echoing the submitted values back from the server would work, but it makes
 * the round trip responsible for something the client already knows. State
 * held here cannot be reset by the form, needs no cooperation from the action,
 * and survives a refusal that never reached the server at all.
 */
export function RegisterApplicationForm({
  products,
  scopes,
  defaultScopes,
}: {
  products: ProductOption[];
  scopes: readonly ApplicationScope[];
  /** Ticked on first render. The admin's edits are kept from then on. */
  defaultScopes: readonly ApplicationScope[];
}) {
  const [state, action] = useActionState(registerApplicationAction, undefined);

  const [productId, setProductId] = useState(products[0]?.id ?? NEW_PRODUCT);
  const [draft, setDraft] = useState<NewProductDraft>({
    id: '',
    name: '',
    kind: 'saas',
  });
  const [name, setName] = useState('');
  const [domains, setDomains] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selected, setSelected] = useState<ApplicationScope[]>([
    ...defaultScopes,
  ]);

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
      <ProductField
        products={products}
        productId={productId}
        onProductChange={setProductId}
        draft={draft}
        onDraftChange={setDraft}
        errors={state?.fieldErrors}
      />

      <label className="mt-4 block text-sm font-medium" htmlFor="app-name">
        Name
      </label>
      <input
        id="app-name"
        name="name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="QuestionCall production"
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <FieldError message={state?.fieldErrors?.['name']} />

      <label className="mt-6 block text-sm font-medium" htmlFor="app-domains">
        Domains
      </label>
      <textarea
        id="app-domains"
        name="domains"
        required
        rows={4}
        value={domains}
        onChange={(event) => setDomains(event.target.value)}
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
      <p className="mt-1 text-xs text-muted-foreground">
        <strong>Still in development?</strong> Register{' '}
        <code className="font-mono">app.localhost</code> — any name under{' '}
        <code className="font-mono">.localhost</code> resolves to 127.0.0.1 in
        every browser, and the port is not part of a hostname, so{' '}
        <code className="font-mono">http://app.localhost:3000</code> is covered
        by that one line. Bare <code className="font-mono">localhost</code> is
        not accepted — it has no dot. Loopback names work only on a local
        deployment and only for a Sandbox credential.
      </p>
      <FieldError message={state?.fieldErrors?.['domains']} />

      <label className="mt-6 block text-sm font-medium" htmlFor="app-webhook">
        Webhook URL <span className="font-normal">(optional)</span>
      </label>
      <input
        id="app-webhook"
        name="webhookUrl"
        type="url"
        value={webhookUrl}
        onChange={(event) => setWebhookUrl(event.target.value)}
        placeholder="https://api.questioncall.com/webhooks/softmato"
        aria-describedby="app-webhook-help"
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <p id="app-webhook-help" className="mt-1 text-xs text-muted-foreground">
        Signed payment events are posted here. Its hostname must be one of the
        domains above — this URL is fetched by our server, so an address we have
        not been told to trust is not one we will call. A signing secret is
        generated with the application and shown once, on the next screen. In
        local development, <code className="font-mono">http://</code> is
        accepted for a <code className="font-mono">.localhost</code> address.
      </p>
      <FieldError message={state?.fieldErrors?.['webhookUrl']} />

      <ScopeCheckboxes
        available={scopes}
        selected={selected}
        onChange={setSelected}
        error={state?.fieldErrors?.['scopes']}
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
