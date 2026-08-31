'use client';

import { useActionState } from 'react';

import { changePassword } from '@/app/(admin)/admin/security/change-password';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * Current password + current code, then the new password twice.
 *
 * The confirm field is not ceremony: this is the one form where a typo locks
 * the person filling it in out of the system, and there is no reset flow to
 * catch them.
 */
export function ChangePasswordForm({ minimum }: { minimum: number }) {
  const [state, action] = useActionState(changePassword, undefined);

  return (
    <form action={action} className="mt-6 grid max-w-md gap-4">
      {state?.message ? (
        <p
          role="alert"
          className={
            state.ok
              ? 'rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-[13px] text-primary'
              : 'rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive'
          }
        >
          {state.message}
        </p>
      ) : null}

      <Field id="current_password" label="Current password" required>
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
        id="current_code"
        label="Code from your authenticator"
        help="The same bar as signing in — a session alone isn't enough to change the password it was issued against."
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

      <Field
        id="new_password"
        label="New password"
        help={`At least ${minimum} characters.`}
        required
      >
        {(props) => (
          <Input
            {...props}
            name="new_password"
            type="password"
            autoComplete="new-password"
            minLength={minimum}
            required
          />
        )}
      </Field>

      <Field id="confirm_password" label="New password again" required>
        {(props) => (
          <Input
            {...props}
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={minimum}
            required
          />
        )}
      </Field>

      <SubmitButton>Change password</SubmitButton>
    </form>
  );
}
