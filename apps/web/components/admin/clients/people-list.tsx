import { setPersonActiveAction } from '@/app/(admin)/admin/clients/actions/set-person-active';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge } from '@/components/ui/badge';
import type { ClientPerson } from '@/lib/clients/queries';
import { formatAdDateTime } from '@/lib/format/date';

import { ActionForm } from './action-form';
import { ReissueInviteButton } from './reissue-invite-button';

function accessState(p: ClientPerson): {
  label: string;
  tone: 'credit' | 'neutral' | 'quiet' | 'flag';
} {
  if (!p.isActive) return { label: 'Access off', tone: 'quiet' };
  if (p.hasPassword) return { label: 'Active', tone: 'credit' };
  if (p.inviteExpiresAt && p.inviteExpiresAt > new Date())
    return { label: 'Invited', tone: 'neutral' };
  return { label: 'Invitation expired', tone: 'flag' };
}

/** Everyone at the client who can sign in, and the controls for each. */
export function PeopleList({ people }: { people: ClientPerson[] }) {
  return (
    <ul className="divide-y divide-border">
      {people.map((p) => {
        const state = accessState(p);

        return (
          <li
            key={p.id}
            className="flex flex-wrap items-start justify-between gap-3 py-3.5 first:pt-0"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {p.name} <Badge tone={state.tone}>{state.label}</Badge>
              </p>
              <p className="text-[13px] text-muted-foreground">{p.email}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {p.lastLoginAt
                  ? `Last signed in ${formatAdDateTime(p.lastLoginAt)}`
                  : 'Never signed in'}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">
                {p.isActive ? (
                  <ReissueInviteButton
                    userId={p.id}
                    label={
                      p.hasPassword
                        ? 'Password reset link'
                        : 'New invitation link'
                    }
                  />
                ) : null}
                <ActionForm
                  action={setPersonActiveAction}
                  confirm={
                    p.isActive
                      ? `Turn off portal access for ${p.name}? They are signed out everywhere at once.`
                      : undefined
                  }
                >
                  <input type="hidden" name="userId" value={p.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={String(!p.isActive)}
                  />
                  <SubmitButton
                    variant="ghost"
                    size="sm"
                    pendingLabel="Saving…"
                  >
                    {p.isActive ? 'Turn off access' : 'Turn access back on'}
                  </SubmitButton>
                </ActionForm>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
