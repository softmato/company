'use client';

import { startTransition, useActionState, useState } from 'react';

import { reissueEnrolment } from '@/app/(admin)/admin/security/reissue-enrolment';
import { removePendingAdmin } from '@/app/(admin)/admin/security/remove-admin';
import { EnrolmentHandoff } from '@/components/admin/enrolment-handoff';
import { SubmitButton } from '@/components/admin/submit-button';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * What you can do about an admin who never finished enrolment: give them a
 * fresh link, or remove the row.
 *
 * Rendered only for that state. An enrolled admin gets no controls here, for
 * the reason `AdminRoster` gives — a reset button next to a working founder is
 * a takeover primitive nine days out of ten and the wrong tool on the tenth.
 *
 * ## Why the person is not re-typed
 *
 * The invite form can already re-issue by re-submitting the same address, but
 * it asks for a name, an address and a fresh starting password to change
 * nothing about the account. Here the row *is* the answer to "who?", so the
 * only thing left to collect is proof of who is asking. Two fields instead of
 * five, and no second password to fall out of step with the one they were
 * given.
 */
export function PendingAdminActions({
  admin,
}: {
  admin: { id: number; email: string; name: string };
}) {
  /* `asking` is the re-auth form; the handoff replaces it once it succeeds. */
  const [asking, setAsking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [reissued, reissue] = useActionState(reissueEnrolment, undefined);
  const [removed, remove, removing] = useActionState(
    removePendingAdmin,
    undefined,
  );

  if (reissued?.ok && reissued.handoff) {
    return <EnrolmentHandoff handoff={reissued.handoff} />;
  }

  return (
    <div className="mt-3">
      {asking ? (
        <form action={reissue} className="grid max-w-sm gap-3">
          <input type="hidden" name="admin_id" value={admin.id} />

          <p className="text-[13px] text-muted-foreground">
            Confirm it is you, and {admin.email} gets a new link. Their password
            is unchanged.
          </p>

          {reissued?.message ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
            >
              {reissued.message}
            </p>
          ) : null}

          {/*
            `id` is scoped to the row: several of these can be open at once,
            and duplicate ids would point every label at the first one.
          */}
          <Field
            id={`reissue_password_${admin.id}`}
            label="Your password"
            required
          >
            {(props) => (
              <Input
                {...props}
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
              />
            )}
          </Field>

          <Field
            id={`reissue_code_${admin.id}`}
            label="Code from your authenticator"
            required
          >
            {(props) => (
              <Input
                {...props}
                name="current_code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                className="font-mono tracking-[0.3em]"
              />
            )}
          </Field>

          <div className="flex items-center gap-2">
            <SubmitButton pendingLabel="Issuing…">
              Issue new link
            </SubmitButton>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAsking(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAsking(true)}
          >
            Re-issue link
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            Remove
          </Button>
        </div>
      )}

      {/*
        Only a failure is shown. A success deletes the row, so the whole
        component goes with it — a message about it would have nowhere to sit.
      */}
      {removed && !removed.ok && removed.message ? (
        <p
          role="alert"
          className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {removed.message}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title={`Remove ${admin.name}?`}
        description={`${admin.email} never finished setting up an authenticator, so nothing is lost but the invitation. You can add them again at any time.`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        pending={removing}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          const data = new FormData();
          data.set('admin_id', String(admin.id));

          setConfirming(false);
          startTransition(() => remove(data));
        }}
      />
    </div>
  );
}
