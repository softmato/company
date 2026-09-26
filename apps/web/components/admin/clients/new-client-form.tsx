'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { createClientAction } from '@/app/(admin)/admin/clients/actions/create-client';
import { SubmitButton } from '@/components/admin/submit-button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { InviteHandoff } from './invite-handoff';

export function NewClientForm() {
  const [state, action] = useActionState(createClientAction, {});

  if (state.invite && state.clientId) {
    return (
      <div className="space-y-4">
        <InviteHandoff invite={state.invite} />
        <Link
          href={`/admin/clients/${state.clientId}`}
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Open the client and add their first project →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <Field id="name" label="Company or client name" required>
        {(props) => <Input {...props} name="name" required maxLength={200} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="contactName" label="Contact person" required>
          {(props) => (
            <Input {...props} name="contactName" required maxLength={200} />
          )}
        </Field>
        <Field
          id="contactEmail"
          label="Their email"
          help="They sign in with this."
          required
        >
          {(props) => (
            <Input
              {...props}
              name="contactEmail"
              type="email"
              required
              maxLength={320}
              autoComplete="off"
            />
          )}
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="emailInvite"
          defaultChecked
          className="size-4 accent-[var(--primary)]"
        />
        Email the invitation to them now
      </label>
      {state.error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <SubmitButton pendingLabel="Creating…">
          Create client and invitation
        </SubmitButton>
      </div>
    </form>
  );
}
