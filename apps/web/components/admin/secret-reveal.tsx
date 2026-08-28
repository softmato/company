'use client';

/**
 * The one and only time a client secret is on screen.
 *
 * Rendered from an action result, which lives in React state and is gone on
 * the next navigation. Nothing here persists it: no localStorage, no URL, no
 * cache. If the founder closes the tab before copying, the answer is to rotate
 * — which is exactly the property that makes "shown once" true rather than
 * merely stated.
 */
export function SecretReveal({
  secret,
  clientId,
  previousSecretExpiresAt,
}: {
  secret: string;
  clientId?: string | undefined;
  previousSecretExpiresAt?: string | undefined;
}) {
  return (
    <div
      role="alert"
      className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-4"
    >
      <p className="text-sm font-medium">
        Copy this now. It is not shown again.
      </p>

      {clientId ? (
        <dl className="mt-3 text-xs">
          <dt className="text-muted-foreground">Client ID</dt>
          <dd className="mt-1 font-mono break-all">{clientId}</dd>
        </dl>
      ) : null}

      <dl className="mt-3 text-xs">
        <dt className="text-muted-foreground">Client secret</dt>
        <dd className="mt-1 font-mono break-all select-all">{secret}</dd>
      </dl>

      {previousSecretExpiresAt ? (
        <p className="mt-3 text-xs text-muted-foreground">
          The previous secret keeps working until{' '}
          {new Date(previousSecretExpiresAt).toUTCString()}. Deploy before then.
        </p>
      ) : null}
    </div>
  );
}
