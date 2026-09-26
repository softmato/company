'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { expiresIn, formatAdDateTime } from '@/lib/format/date';

export interface InviteDetails {
  url: string;
  expiresAt: string;
  name: string;
  email: string;
  emailed?: boolean | undefined;
  emailError?: string | undefined;
}

/**
 * The invitation link, once, for the founder to pass on. It lives only in
 * this component's state — reload and it is gone; re-issue for a new one.
 *
 * "Copy message" is the link wrapped in a sentence, ready for WhatsApp or
 * email, because that is where it is going next.
 */
export function InviteHandoff({ invite }: { invite: InviteDetails }) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const firstName = invite.name.split(/\s+/)[0];
  const message = `Hi ${firstName}, here is your link to the Softmato client portal, where you can follow the project, share files and see invoices: ${invite.url}\n\nIt works once and expires ${expiresIn(new Date(invite.expiresAt))}.`;

  function copy(text: string, which: 'link' | 'message') {
    void navigator.clipboard
      .writeText(text)
      .then(() => setCopied(which))
      .catch(() => setCopied(null));
  }

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-medium">Invitation link for {invite.email}</p>
      <p className="mt-2 break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-[12.5px]">
        {invite.url}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => copy(invite.url, 'link')}
        >
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => copy(message, 'message')}
        >
          {copied === 'message' ? 'Copied' : 'Copy message'}
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          Expires {expiresIn(new Date(invite.expiresAt))} —{' '}
          {formatAdDateTime(new Date(invite.expiresAt))}
        </p>
      </div>
      {invite.emailed ? (
        <p role="status" className="mt-3 text-[13px] font-medium text-primary">
          Emailed to {invite.email}.
        </p>
      ) : invite.emailError ? (
        <p role="alert" className="mt-3 text-[13px] text-destructive">
          The email did not go out ({invite.emailError}). Copy the link and send
          it yourself.
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Shown once. They choose a password when they open it. Only the newest
        link works.
      </p>
    </div>
  );
}
