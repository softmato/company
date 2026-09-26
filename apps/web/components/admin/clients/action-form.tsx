'use client';

import { useActionState, useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';

export interface ActionFormState {
  error?: string;
  ok?: number;
}

/**
 * A form bound to a server action that answers `{ error?, ok? }`, with the
 * error rendered beneath it. Lets a server component lay out a whole editor
 * of small forms without a client component per form.
 *
 * `confirm` asks first, with the browser's own dialog — enough for a delete
 * that cannot be undone, and nothing to build.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  confirm,
}: {
  action: (
    state: ActionFormState,
    formData: FormData,
  ) => Promise<ActionFormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean | undefined;
  confirm?: string | undefined;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [resetOnSuccess, state.ok]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={cn(className)}
      onSubmit={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : undefined
      }
    >
      {children}
      {state.error ? (
        <p role="alert" className="basis-full text-[13px] text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
