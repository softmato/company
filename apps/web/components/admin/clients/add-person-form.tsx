'use client';

import { useActionState } from 'react';

import { addPersonAction } from '@/app/(admin)/admin/clients/actions/add-person';
import { SubmitButton } from '@/components/admin/submit-button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { InviteHandoff } from './invite-handoff';

export function AddPersonForm({ clientId }: { clientId: number }) {
  const [state, action] = useActionState(addPersonAction, {});

  return (
    <div className="space-y-4">
      {state.invite ? <InviteHandoff invite={state.invite} /> : null}
      <form
        action={action}
        key={state.invite?.url}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <input type="hidden" name="clientId" value={clientId} />
        <Field id="person-name" label="Name">
          {(props) => <Input {...props} name="name" required maxLength={200} />}
        </Field>
        <Field id="person-email" label="Email">
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              required
              maxLength={320}
              autoComplete="off"
            />
          )}
        </Field>
        <SubmitButton variant="secondary" pendingLabel="Adding…">
          Add person
        </SubmitButton>
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input
            type="checkbox"
            name="emailInvite"
            defaultChecked
            className="size-4 accent-[var(--primary)]"
          />
          Email the invitation to them now
        </label>
        {state.error ? (
          <p
            role="alert"
            className="text-[13px] text-destructive sm:col-span-3"
          >
            {state.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
