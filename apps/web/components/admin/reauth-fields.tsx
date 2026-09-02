'use client';

/**
 * Password and a live authenticator code, for the acts that mint or reveal a
 * live credential.
 *
 * One component rather than the same two inputs written out at each call site,
 * for the same reason `reauth.ts` is one function: four copies is four chances
 * for one of them to drop the code field, which fails open and looks like
 * nothing.
 *
 * `autoComplete="off"` on the password because this is a re-authentication
 * prompt, not a sign-in — offering to save it here trains the browser to fill
 * it into a form whose purpose is to prove someone is present.
 */
export function ReauthFields({
  idPrefix,
  error,
}: {
  idPrefix: string;
  error?: string | undefined;
}) {
  return (
    <fieldset className="mt-3">
      <legend className="sr-only">Confirm it is you</legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            className="block text-xs font-medium"
            htmlFor={`${idPrefix}-password`}
          >
            Your password
          </label>
          <input
            id={`${idPrefix}-password`}
            name="password"
            type="password"
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium"
            htmlFor={`${idPrefix}-code`}
          >
            Authenticator code
          </label>
          <input
            id={`${idPrefix}-code`}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="mt-1 w-full rounded-md border border-input px-3 py-2 font-mono text-sm"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
