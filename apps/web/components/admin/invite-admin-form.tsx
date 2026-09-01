'use client';

import { useActionState } from 'react';

import { inviteAdmin } from '@/app/(admin)/admin/security/invite-admin';
import { EnrolmentHandoff } from '@/components/admin/enrolment-handoff';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * Your credentials at the top, theirs below.
 *
 * The order is the argument: re-authentication is not a formality attached to
 * the end of a form, it is the thing that makes the rest of it permissible.
 * Creating an admin mints a credential that outlives this session, so a
 * borrowed laptop must not be enough — password *and* a live code, the same
 * bar as changing your own password.
 */
export function InviteAdminForm({ minimum }: { minimum: number }) {
  const [state, action] = useActionState(inviteAdmin, undefined);

  if (state?.ok && state.handoff) {
    return <EnrolmentHandoff handoff={state.handoff} />;
  }

  return (
    <form action={action} className="mt-6 grid max-w-md gap-4">
      {state?.message ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      <Field
        id="invite_current_password"
        label="Your password"
        help="Confirms it is you adding a founder, not whoever found this screen open."
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
        id="invite_current_code"
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

      <hr className="my-2 border-border" />

      <Field
        id="invite_name"
        label="Their name"
        error={state?.fieldErrors?.name}
        required
      >
        {(props) => (
          <Input {...props} name="name" type="text" autoComplete="off" required />
        )}
      </Field>

      <Field
        id="invite_email"
        label="Their email"
        help="What they sign in with. It cannot be changed from here later."
        error={state?.fieldErrors?.email}
        required
      >
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="off"
            required
          />
        )}
      </Field>

      <Field
        id="invite_password"
        label="A starting password for them"
        help={`At least ${minimum} characters. Tell them out of band — there is no reset link, so they change it under Security once they are in.`}
        error={state?.fieldErrors?.password}
        required
      >
        {(props) => (
          <Input
            {...props}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={minimum}
            required
          />
        )}
      </Field>

      <SubmitButton pendingLabel="Creating…">
        Create account and show QR
      </SubmitButton>
    </form>
  );
}
