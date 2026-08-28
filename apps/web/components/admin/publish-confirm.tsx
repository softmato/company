'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * The confirm step in front of publish and unpublish.
 *
 * "A founder must never publish by mis-clicking" (docs/UI_BRIEF.md §3.2). The
 * button opens a dialog; only the dialog's confirm submits the form.
 *
 * The real submit is `requestSubmit()` on the form itself rather than a fetch,
 * so the server action, its revalidation and its audit entry all run exactly
 * as they do without JavaScript. If the dialog never mounts, the form is still
 * a plain form with a submit button in it.
 */
export function PublishConfirm({
  published,
  title,
}: {
  published: boolean;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={buttonRef}
        variant={published ? 'secondary' : 'primary'}
        onClick={() => setOpen(true)}
      >
        {published ? 'Unpublish' : 'Publish'}
      </Button>

      <ConfirmDialog
        open={open}
        title={published ? `Unpublish ${title}?` : `Publish ${title}?`}
        description={
          published
            ? 'It disappears from the public site immediately. Anyone holding a link to it will get a 404.'
            : 'It goes live on the public site immediately, and anyone can read it.'
        }
        confirmLabel={published ? 'Unpublish' : 'Publish'}
        confirmVariant={published ? 'destructive' : 'primary'}
        onConfirm={() => {
          setOpen(false);
          buttonRef.current?.form?.requestSubmit();
        }}
        /*
         * Cancel closes and does nothing else — no submit, and so no success
         * message about something that did not happen.
         */
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

/** Mirrors the pending state onto the trigger once the form is in flight. */
export function PublishPending() {
  const { pending } = useFormStatus();

  return pending ? (
    <span role="status" className="text-sm text-muted-foreground">
      Working…
    </span>
  ) : null;
}
