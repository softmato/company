'use client';

import { useEffect, useRef } from 'react';

import { Button, type ButtonVariant } from '@/components/ui/button';

/**
 * The confirm step in front of anything that publishes, reverses or destroys
 * (docs/handoff/UI_HANDOFF.md §8).
 *
 * Built on the native `<dialog>` and `showModal()`, which gives focus
 * trapping, the inert backdrop, Escape-to-close and the right ARIA role
 * without a dependency or a hand-rolled focus loop.
 *
 * **Cancel resolves to nothing.** Escape, the backdrop and the Cancel button
 * all land in `onCancel`, and none of them may run the confirm path — a
 * success toast after a cancelled publish tells a founder they published
 * something they did not.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  pending,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        // Escape. Preventing the default close lets React own the open state.
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // The backdrop is the dialog element itself; the panel stops the click.
        if (event.target === ref.current) onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-0 text-foreground shadow-float backdrop:bg-black/40 open:animate-rise"
    >
      <div className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
        <h2 id="confirm-title" className="headline text-[17px]">
          {title}
        </h2>
        <p
          id="confirm-description"
          className="mt-1.5 text-sm text-muted-foreground"
        >
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
