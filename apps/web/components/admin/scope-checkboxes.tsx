'use client';

import type { ApplicationScope } from '@softmato/db';

/**
 * Scope picker (docs/API.md §2).
 *
 * `available` is passed in rather than imported. `APPLICATION_SCOPES` lives in
 * `@softmato/db` next to the `scopes_known` check constraint — which is where
 * it belongs — but importing that value here would pull the database client,
 * and therefore `pg`, into the browser bundle. The type import survives
 * because types are erased; the list arrives from the server component.
 *
 * What is never offered at all: refund approval, accounting access,
 * cross-product reads, provider configuration. Those have no scope to grant,
 * which is a stronger guarantee than an unchecked box.
 */
const DESCRIPTION: Record<ApplicationScope, string> = {
  'payment:create': 'Open a checkout session',
  'payment:read': 'Read its own transactions',
  'invoice:create': 'Raise an invoice',
  'invoice:read': 'Read its own invoices',
  'refund:request': 'Request a refund — approval stays with an admin',
  'customer:read': 'Read its own customers',
};

export function ScopeCheckboxes({
  available,
  name = 'scopes',
  selected,
  error,
}: {
  available: readonly ApplicationScope[];
  name?: string;
  selected?: readonly ApplicationScope[] | undefined;
  error?: string | undefined;
}) {
  const chosen = new Set(selected ?? []);

  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-medium">Scopes</legend>

      <div className="mt-2 space-y-2">
        {available.map((scope) => (
          <label key={scope} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={scope}
              defaultChecked={chosen.has(scope)}
              className="mt-0.5 size-4 rounded-sm border-input"
            />
            <span>
              <span className="font-mono text-xs">{scope}</span>
              <span className="block text-xs text-muted-foreground">
                {DESCRIPTION[scope]}
              </span>
            </span>
          </label>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
