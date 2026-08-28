'use client';

import { useActionState } from 'react';

import type { ApplicationScope } from '@softmato/db';

import { registerApplicationAction } from '@/app/(admin)/admin/products/actions';
import { ScopeCheckboxes } from '@/components/admin/scope-checkboxes';
import { SecretReveal } from '@/components/admin/secret-reveal';
import { SubmitButton } from '@/components/admin/submit-button';

export function RegisterApplicationForm({
  products,
  scopes,
}: {
  products: { id: string; name: string }[];
  scopes: readonly ApplicationScope[];
}) {
  const [state, action] = useActionState(registerApplicationAction, undefined);

  return (
    <form action={action} className="mt-4 max-w-lg">
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
        placeholder="HostelHub production"
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <FieldError message={state?.fieldErrors?.name} />

      <label className="mt-4 block text-sm font-medium" htmlFor="app-webhook">
        Webhook URL <span className="font-normal">(optional)</span>
      </label>
      <input
        id="app-webhook"
        name="webhookUrl"
        type="url"
        placeholder="https://hostelhub.com/webhooks/softmato"
        aria-describedby="app-webhook-help"
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      <p id="app-webhook-help" className="mt-1 text-xs text-muted-foreground">
        Signed payment events are posted here. A signing secret is generated
        with the application and never shown — the consumer reads it from the
        credential handover, not from this panel.
      </p>
      <FieldError message={state?.fieldErrors?.webhookUrl} />

      <ScopeCheckboxes available={scopes} error={state?.fieldErrors?.scopes} />

      {/*
       * Hidden 'false' first, same reason as the settings form: an unchecked
       * box sends nothing, and "nothing" must not read as "live".
       */}
      <input type="hidden" name="isLive" value="false" />
      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="isLive"
          value="true"
          className="size-4 rounded-sm border-input"
        />
        Live credential
        <span className="text-xs font-normal text-muted-foreground">
          leave off for a sandbox integration
        </span>
      </label>

      <div className="mt-6 flex items-center gap-3">
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

      {state?.ok && state.secret ? (
        <SecretReveal secret={state.secret} clientId={state.clientId} />
      ) : null}
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
