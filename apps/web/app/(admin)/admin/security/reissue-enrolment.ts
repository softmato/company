'use server';

import { recordAudit } from '@/lib/audit';
import { findPendingAdmin } from '@/lib/enrolment/queries';

import { parseId, requireAdmin } from '../cms/actions/shared';
import { buildHandoff, type Handoff } from './handoff';
import { reauthenticate } from './reauth';

export interface ReissueResult {
  ok: boolean;
  message?: string;
  handoff?: Handoff;
}

/**
 * A fresh enrolment link for someone who never used their last one.
 *
 * The invite form can already do this by re-submitting the same address, but
 * that asks a founder to retype a name, an address and a new password to
 * change nothing about the account — and inventing a second starting password
 * for someone who was already told the first is how the two get out of step.
 * From the roster, the person is already chosen: all that is missing is proof
 * of who is asking.
 *
 * ## Why re-authentication
 *
 * This mints a bearer credential that turns an inert row into a founder who
 * can sign in — the same act, and the same stakes, as the invite it replaces.
 * A stolen session must not be enough to quietly hand itself a second account,
 * so the password and a live code are required here exactly as they are there.
 *
 * ## Why the target is re-read
 *
 * `findPendingAdmin` matches only `(inactive, no second factor)`. An id posted
 * to this endpoint therefore cannot address an enrolled admin, so no amount of
 * guessing at ids mints a link for an account that can already sign in — which
 * would be a takeover, not a re-issue.
 */
export async function reissueEnrolment(
  _previous: ReissueResult | undefined,
  form: FormData,
): Promise<ReissueResult> {
  const actorId = await requireAdmin();

  const targetId = parseId(form.get('admin_id'));
  const password = String(form.get('current_password') ?? '');
  const code = String(form.get('current_code') ?? '');

  const me = await reauthenticate(Number(actorId), password, code);

  if (!me.ok) {
    await recordAudit({
      actorType: 'admin',
      actorId,
      action: 'admin.invite_failed',
      resourceType: 'admin_user',
      resourceId: String(targetId),
      afterState: { reason: 'reauth_failed' },
    });

    return {
      ok: false,
      message: 'Your password or code was wrong. No new link was issued.',
    };
  }

  const subject = await findPendingAdmin(targetId);

  if (!subject) {
    return {
      ok: false,
      message:
        'That account is no longer awaiting enrolment. Reload the page to see where it stands.',
    };
  }

  const handoff = await buildHandoff(subject, true);

  await recordAudit({
    actorType: 'admin',
    actorId,
    action: 'admin.invite_reissued',
    resourceType: 'admin_user',
    resourceId: String(subject.id),
    afterState: { email: subject.email, name: subject.name },
  });

  /*
   * Deliberately no `revalidatePath`. Nothing about the row changed — it was
   * pending before and is pending still — and refreshing the route would tear
   * down and rebuild the component holding the QR that was just produced,
   * which is the whole thing this returns.
   */
  return { ok: true, handoff };
}
