'use client';

import { useFormStatus } from 'react-dom';

import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/ui/button';
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
  size = 'default',
  className,
  pendingLabel = 'Working…',
  ...rest
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  pendingLabel?: string;
} & Pick<
  React.ComponentProps<'button'>,
  'name' | 'value' | 'title' | 'aria-label'
>) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      {...rest}
    >
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
