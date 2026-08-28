'use client';

import { useFormStatus } from 'react-dom';

import { Button, type ButtonVariant } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/**
 * Submit button that disables itself while the action is in flight.
 *
 * Separate from the form because `useFormStatus` only reports the status of a
 * parent form — it has to be its own component to work at all.
 *
 * The label changes as well as the spinner appearing: the spinner is
 * `aria-hidden`, so the label is the only part of the pending state a screen
 * reader gets.
 */
export function SubmitButton({
  children,
  variant = 'primary',
  pendingLabel = 'Working…',
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
