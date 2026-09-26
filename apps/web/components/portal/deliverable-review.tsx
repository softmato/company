'use client';

import { useActionState, useState } from 'react';
import { CircleCheckBig, MessageSquareWarning, RotateCcw } from 'lucide-react';

import { reviewDeliverable } from '@/app/(portal)/portal/actions/review-deliverable';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * Approve, or send back with a note. The note is required to send it back —
 * "changes requested" with no word of what is how a round trip gets wasted.
 */
export function DeliverableReview({
  deliverableId,
}: {
  deliverableId: number;
}) {
  const [state, action] = useActionState(reviewDeliverable, {});
  const [asking, setAsking] = useState(false);
  const noteId = `review-note-${deliverableId}`;

  return (
    <form
      action={action}
      className="mt-4 rounded-xl bg-violet-50/70 p-3 ring-1 ring-inset ring-violet-200/70"
    >
      <input type="hidden" name="deliverableId" value={deliverableId} />

      {asking ? (
        <div className="space-y-2">
          <label
            htmlFor={noteId}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800"
          >
            <MessageSquareWarning className="size-4" aria-hidden="true" />
            What should change?
          </label>
          <Textarea
            id={noteId}
            name="note"
            rows={3}
            required
            maxLength={4000}
            autoFocus
            className="bg-white"
          />
          <div className="flex flex-wrap gap-2">
            <input type="hidden" name="decision" value="changes" />
            <SubmitButton
              pendingLabel="Sending…"
              className="bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/25 hover:opacity-95"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Send back with this note
            </SubmitButton>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium text-violet-800">
            Happy with this?
          </p>
          <input type="hidden" name="decision" value="approve" />
          <Button
            variant="secondary"
            onClick={() => setAsking(true)}
            className="bg-white text-amber-700 ring-1 ring-inset ring-amber-200 hover:bg-amber-50"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Request changes
          </Button>
          <SubmitButton
            pendingLabel="Approving…"
            className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25 hover:opacity-95"
          >
            <CircleCheckBig className="size-4" aria-hidden="true" />
            Approve
          </SubmitButton>
        </div>
      )}

      {state.error ? (
        <p role="alert" className="mt-2 text-[13px] text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
