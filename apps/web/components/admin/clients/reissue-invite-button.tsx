'use client';

import { useActionState } from 'react';

import { reissueInviteAction } from '@/app/(admin)/admin/clients/actions/reissue-invite';
import { SubmitButton } from '@/components/admin/submit-button';

import { InviteHandoff } from './invite-handoff';

/**
 * A fresh invitation or password-reset link: emailed to them, or only shown
 * here to pass on another way. Either way the link is shown once.
 */
export function ReissueInviteButton({
  userId,
  label,
}: {
  userId: number;
  label: string;
}) {
  const [state, action] = useActionState(reissueInviteAction, {});

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap justify-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton
          variant="secondary"
          size="sm"
          name="send"
          value="email"
          pendingLabel="Sending…"
        >
          Email {label.toLowerCase()}
        </SubmitButton>
        <SubmitButton
          variant="ghost"
          size="sm"
          name="send"
          value="show"
          pendingLabel="Creating…"
        >
          Show link
        </SubmitButton>
      </form>
      {state.error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.invite ? <InviteHandoff invite={state.invite} /> : null}
    </div>
  );
}
