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
 * **`autoComplete="new-password"`, not `"off"`.** Chrome ignores `off` on a
 * password input: it decides a form holding one is a sign-in form, fills the
 * saved password, and fills the account's email into whatever text input sits
 * nearest above it — looking for the username field. On this page that input
 * is the webhook URL, or the field where the application's name has to be
 * typed to confirm a revocation. The founder's first screenshot of the
 * finished panel had `sidd@softmato.com` sitting in both.
 *
 * `new-password` is the documented way to say "this is not the credential you
 * have saved". It costs a manual pick from the password manager, which is the
 * right trade against a form that silently rewrites the field above it — and
 * it is what a re-authentication prompt wants anyway: offering to save it here
 * trains the browser to fill a form whose purpose is to prove someone is
 * present.
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
            autoComplete="new-password"
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
