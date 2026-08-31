'use client';

import { useActionState } from 'react';

import { rotateTotp } from '@/app/(admin)/admin/security/actions';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/admin/submit-button';

interface RotateTotpFormProps {
  children: React.ReactNode;
  /** Sealed candidate secret, minted server-side for this render. */
  pending: string;
}

/**
 * Re-authenticate, then confirm the new device.
 *
 * The old code and the new code are both on this form on purpose. Splitting it
 * into two steps would need somewhere to keep "this person already proved the
 * old factor", and a half-completed rotation is exactly the state that leaves
 * an admin with neither device working.
 */
export function RotateTotpForm({ children, pending }: RotateTotpFormProps) {
  const [state, action] = useActionState(rotateTotp, undefined);

  return (
    <form action={action} className="mt-6 grid max-w-md gap-4">
      <input type="hidden" name="pending" value={pending} />

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

      <Field id="password" label="Your password" required>
        {(props) => (
          <Input
            {...props}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </Field>

      <Field
        id="current"
        label="Code from your current authenticator"
        help="Proves you still hold the device you're replacing."
        required
      >
        {(props) => (
          <Input
            {...props}
            name="current"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            className="font-mono tracking-[0.3em]"
          />
        )}
      </Field>

      {children}

      <SubmitButton>Replace authenticator</SubmitButton>
    </form>
  );
}
