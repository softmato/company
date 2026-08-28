'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { submitContact } from '@/app/(public)/(site)/contact/actions';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export function ContactForm() {
  const [state, action] = useActionState(submitContact, undefined);

  /*
   * Success replaces the form rather than sitting beside it. Leaving a filled
   * form on screen under a "thanks" invites a second identical submission,
   * and the honeypot cannot tell those apart from the first.
   */
  if (state?.ok) {
    return (
      <div
        role="status"
        className="mt-8 max-w-lg rounded-xl border border-credit/30 bg-credit/5 px-5 py-5"
      >
        <p className="headline text-[17px]">{state.message}</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We reply within two working days. If it is urgent, the phone number
          in the footer reaches us faster.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid max-w-lg gap-4">
      {/*
       * Honeypot. Hidden from people with CSS and from screen readers with
       * aria-hidden + tabIndex, so it never reaches a real visitor — but it is
       * a normal field in the DOM, which is all a naive bot looks at.
       *
       * Never `display:none`: the bots worth catching check for it.
       */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Field id="name" label="Name" required error={state?.fieldErrors?.name}>
        {(props) => (
          <Input {...props} name="name" autoComplete="name" required />
        )}
      </Field>

      <Field id="email" label="Email" required error={state?.fieldErrors?.email}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        )}
      </Field>

      <Field id="phone" label="Phone" error={state?.fieldErrors?.phone}>
        {(props) => (
          <Input {...props} name="phone" type="tel" autoComplete="tel" />
        )}
      </Field>

      <Field id="subject" label="Subject" error={state?.fieldErrors?.subject}>
        {(props) => <Input {...props} name="subject" />}
      </Field>

      <Field
        id="message"
        label="What are you building?"
        required
        error={state?.fieldErrors?.message}
      >
        {(props) => <Textarea {...props} name="message" rows={6} required />}
      </Field>

      {/*
       * A form-level failure — rate limiting, or the database being
       * unreachable. Field errors render against their field; this is for
       * everything that belongs to the submission as a whole.
       */}
      {state && !state.ok && state.message ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      <SendButton />
    </form>
  );
}

/**
 * Its own component because `useFormStatus` only reports the status of a
 * parent form — inside `ContactForm` it would always read false.
 */
function SendButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="mt-1 justify-self-start">
      {pending ? (
        <>
          <Spinner />
          Sending…
        </>
      ) : (
        'Send message'
      )}
    </Button>
  );
}
