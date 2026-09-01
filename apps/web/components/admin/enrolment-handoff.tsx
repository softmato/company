'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Handoff } from '@/app/(admin)/admin/security/handoff';
import { expiresIn, formatAdDateTime } from '@/lib/format/date';

/**
 * What you show the new admin once their account exists.
 *
 * The QR encodes the enrolment **URL**, not a TOTP secret. They point a phone
 * camera at this screen, `/enrol` opens on their device, and the authenticator
 * secret is generated and confirmed there — where only they ever see it.
 *
 * The link is shown as text too. A remote founder gets it pasted into whatever
 * channel you already trust; the QR is for the case where you are both in the
 * room, which is the one where nothing has to be pasted anywhere at all.
 */
export function EnrolmentHandoff({ handoff }: { handoff: Handoff }) {
  const [copied, setCopied] = useState(false);

  const expires = new Date(handoff.expiresAt);

  return (
    <div className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <h3 className="text-sm font-medium">
        {handoff.reissued
          ? `New enrolment link for ${handoff.email}`
          : `Account created for ${handoff.email}`}
      </h3>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        {handoff.reissued
          ? 'The previous link is replaced. This account still cannot sign in until enrolment finishes.'
          : 'It cannot sign in yet.'}
      </p>

      {/*
        Stated as a warning rather than as prose, because the failure it
        prevents is silent and confusing: an authenticator app pointed at this
        code answers "invalid QR", which reads as a broken invite rather than
        as the wrong app. This QR is a link — the authenticator's own QR is on
        the page it opens.
      */}
      <p className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-[13px]">
        <strong className="font-medium text-foreground">
          Scan with the phone&rsquo;s camera, not an authenticator app.
        </strong>{' '}
        <span className="text-muted-foreground">
          This code is a link. The authenticator QR is on the page it opens.
        </span>
      </p>

      <div className="mt-4 flex justify-center rounded-lg border border-border bg-white p-3">
        {/*
          Server-rendered SVG, inlined rather than an image src. The URL carries
          a one-time enrolment token, and a token in an image URL reaches the
          access log, the history and the referrer.
        */}
        <div
          role="img"
          aria-label={`QR code linking to the enrolment page for ${handoff.email}`}
          // Safe: `qrcode` generated this from a URL we built ourselves.
          dangerouslySetInnerHTML={{ __html: handoff.qr }}
        />
      </div>

      <p className="mt-4 text-[13px] text-muted-foreground">
        Or send them this link:
      </p>
      <p className="mt-1.5 break-all rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px]">
        {handoff.url}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard
              .writeText(handoff.url)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        {/*
          The duration leads, the timestamp confirms it. A bare
          "Expires 9/2/2026, 3:18:52 PM" beside a clock reading 3:19 PM differs
          only in a date, and reads as already dead.
        */}
        <p aria-live="polite" className="text-[13px] text-muted-foreground">
          Expires {expiresIn(expires)}
          <span className="text-muted-foreground/70">
            {' '}
            — {formatAdDateTime(expires)}
          </span>
        </p>
      </div>

      <p className="mt-4 text-[13px] text-muted-foreground">
        The link stops working the moment it is used, and this QR is not shown
        again. If it expires or gets lost, use{' '}
        <strong className="font-medium text-foreground">Re-issue link</strong>{' '}
        beside their name in the roster above. Tell them the password you set,
        and to change it under Security once they are in.
      </p>
    </div>
  );
}
