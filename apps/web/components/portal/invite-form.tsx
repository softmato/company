'use client';

import { useActionState } from 'react';

import { acceptInvitation } from '@/app/(portal)/portal/actions/accept-invite';
import { SubmitButton } from '@/components/admin/submit-button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function InviteForm({
  token,
  email,
  minLength,
}: {
  token: string;
  email: string;
  minLength: number;
}) {
  const [state, action] = useActionState(acceptInvitation, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {/* Lets a password manager file the new password under the right account. */}
      <input
        type="email"
        name="username"
        value={email}
        autoComplete="username"
        readOnly
        hidden
      />

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Field
        id="password"
        label="New password"
        help={`At least ${minLength} characters.`}
      >
        {(props) => (
          <Input
            {...props}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={minLength}
            required
          />
        )}
      </Field>

      <Field id="confirm" label="Type it again">
        {(props) => (
          <Input
            {...props}
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={minLength}
            required
          />
        )}
      </Field>

      <div className="pt-1 [&>button]:w-full">
        <SubmitButton pendingLabel="Saving…">Save and continue</SubmitButton>
      </div>
    </form>
  );
}
