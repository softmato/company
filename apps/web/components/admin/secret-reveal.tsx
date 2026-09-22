'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * The one and only time a client secret is on screen — in a modal, so it
 * cannot scroll past unread or vanish under a page refresh.
 *
 * Rendered from an action result, which lives in React state and is gone on
 * the next navigation. Nothing here persists it: no localStorage, no URL, no
 * cache. If the founder closes it before copying, the answer is to rotate —
 * which is exactly the property that makes "shown once" true rather than
 * merely stated.
 *
 * Escape and the backdrop do nothing: the only way out is the button that says
 * the values were copied.
 */
export function SecretReveal({
  secret,
  clientId,
  webhookSecret,
  previousSecretExpiresAt,
  onClose,
}: {
  secret: string;
  clientId?: string | undefined;
  webhookSecret?: string | undefined;
  previousSecretExpiresAt?: string | undefined;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="secret-title"
      onCancel={(event) => event.preventDefault()}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-0 text-foreground shadow-float backdrop:bg-black/50 open:animate-rise"
    >
      <div className="px-5 py-4">
        <h2 id="secret-title" className="headline text-[17px]">
          Copy these now
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The client secret is not shown again. Lose it and the only way back is
          to rotate.
        </p>

        <dl className="mt-4 space-y-3 text-sm">
          {clientId ? <Value label="Client ID" value={clientId} /> : null}
          <Value
            label="Client secret — SOFTMATO_SECRET, the Bearer token"
            value={secret}
          />
          {webhookSecret ? (
            <Value
              label="Signing secret — SOFTMATO_WEBHOOK_SECRET, verifies our webhooks"
              value={webhookSecret}
            />
          ) : null}
        </dl>

        {previousSecretExpiresAt ? (
          <p className="mt-3 text-xs text-muted-foreground">
            The previous secret keeps working until{' '}
            {new Date(previousSecretExpiresAt).toUTCString()}. Deploy before
            then.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            onClick={() => {
              ref.current?.close();
              onClose();
            }}
          >
            I have copied them
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-start gap-2">
        <code className="flex-1 rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-all select-all">
          {value}
        </code>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            navigator.clipboard.writeText(value).then(() => setCopied(true))
          }
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </dd>
    </div>
  );
}
