'use client';

import { useActionState } from 'react';

import { signIn } from '@/app/(portal)/portal/actions/sign-in';
import { SubmitButton } from '@/components/admin/submit-button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function SignInForm() {
  const [state, action] = useActionState(signIn, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Field id="email" label="Email">
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={state.email}
          />
        )}
      </Field>

      <Field id="password" label="Password">
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

      <div className="pt-1 [&>button]:w-full">
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </div>
    </form>
  );
}
