'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * The one and only time these secrets are on screen.
 *
 * Rendered from an action result, which lives in React state and is gone on
 * the next navigation. Nothing here persists them: no localStorage, no URL, no
 * cache. If the founder closes the tab before copying, the answer is to rotate
 * — which is exactly the property that makes "shown once" true rather than
 * merely stated.
 *
 * ## Why both are on one page, with labels this loud
 *
 * They are different credentials and neither works in the other's place:
 *
 *   - the **client secret** authenticates the product *to us*, on every API
 *     request, and is argon2id-hashed here — it genuinely cannot be read back;
 *   - the **webhook signing secret** authenticates *us to the product*, on
 *     every delivery, and is the value the consumer verifies against.
 *
 * Handing them over in one place with the direction of trust spelled out is
 * cheaper than the support thread that starts with a consumer verifying
 * signatures against the client secret and getting nothing but 401s.
 *
 * The acknowledgement is not a legal formality. It is the only thing standing
 * between the founder and a navigation that discards a live credential.
 */
export function CredentialHandover({
  clientId,
  secret,
  webhookSecret,
  applicationId,
}: {
  clientId?: string | undefined;
  secret: string;
  webhookSecret?: string | undefined;
  applicationId?: number | undefined;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div
      role="alert"
      className="mt-6 rounded-md border border-primary/40 bg-primary/5 p-4"
    >
      <p className="text-sm font-medium">
        Copy these now. They are not shown again.
      </p>

      {clientId ? (
        <dl className="mt-4 text-xs">
          <dt className="text-muted-foreground">Client ID</dt>
          <dd className="mt-1 font-mono break-all select-all">{clientId}</dd>
        </dl>
      ) : null}

      <dl className="mt-4 text-xs">
        <dt className="font-medium">Client secret</dt>
        <dd className="mt-1 font-mono break-all select-all">{secret}</dd>
        <dd className="mt-1 text-muted-foreground">
          Sent as <code className="font-mono">Authorization: Bearer …</code> on
          every API request. Server-side only — never in a browser bundle or a
          mobile app. Hashed here, so a lost one is rotated, not recovered.
        </dd>
      </dl>

      {webhookSecret ? (
        <dl className="mt-4 border-t border-primary/20 pt-4 text-xs">
          <dt className="font-medium">Webhook signing secret</dt>
          <dd className="mt-1 font-mono break-all select-all">
            {webhookSecret}
          </dd>
          <dd className="mt-1 text-muted-foreground">
            A <strong>different</strong> credential. The consumer verifies{' '}
            <code className="font-mono">X-Softmato-Signature</code> against it
            before reading any field of the body. It does not authenticate
            anything to us, and the client secret will not verify a signature.
          </dd>
        </dl>
      ) : null}

      <label className="mt-5 flex items-start gap-2 border-t border-primary/20 pt-4 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-0.5 size-4 rounded-sm border-input"
        />
        <span>
          I have copied {webhookSecret ? 'both secrets' : 'the secret'}{' '}
          somewhere safe.
        </span>
      </label>

      {acknowledged && applicationId ? (
        <p className="mt-4 text-sm">
          <Link
            href={`/admin/applications/${applicationId}`}
            className="underline underline-offset-4"
          >
            Go to the application
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Leaving this page discards {webhookSecret ? 'them' : 'it'}.
        </p>
      )}
    </div>
  );
}
