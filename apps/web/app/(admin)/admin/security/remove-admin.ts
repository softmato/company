'use server';

import { revalidatePath } from 'next/cache';

import { recordAudit } from '@/lib/audit';
import { deletePendingAdmin } from '@/lib/enrolment/queries';

import { parseId, requireAdmin } from '../cms/actions/shared';

export interface RemoveResult {
  ok: boolean;
  message?: string;
}

/**
 * Removes an admin who was created and never enrolled.
 *
 * This is the tidy-up for a mistyped address or an invite that was never going
 * to be used — a row in that state holds nothing at all: no authenticator
 * secret, no session, no login history, and `authorize()` refuses it before it
 * looks at a password. Deleting it takes nothing away from anybody.
 *
 * ## Why this one gets a button when deactivating does not
 *
 * The roster stays read-only for enrolled admins, and that has not changed.
 * The argument against a button there is that resetting a *working* founder is
 * a takeover primitive, and that with two founders the account that would use
 * it is as likely to be the locked-out one — so it belongs somewhere that
 * needs the database rather than a session.
 *
 * None of that is true of a row that cannot sign in. There is nothing to take
 * over, and getting it wrong costs one re-invite. `deletePendingAdmin` puts
 * that distinction in the `where` clause rather than trusting this file to
 * remember it, so an id naming an enrolled admin deletes nothing.
 *
 * ## Why no re-authentication
 *
 * Unlike inviting or re-issuing, this mints nothing and grants nothing — the
 * worst a stolen session achieves is deleting an invite that can be re-issued
 * in a minute. The confirm dialog is there for the slip, and the audit row for
 * the record. Demanding a password and a live code for every bit of tidying is
 * how a security prompt becomes something people click through without
 * reading, which costs more than it protects.
 */
export async function removePendingAdmin(
  _previous: RemoveResult | undefined,
  form: FormData,
): Promise<RemoveResult> {
  const actorId = await requireAdmin();
  const targetId = parseId(form.get('admin_id'));

  const removed = await deletePendingAdmin(targetId);

  if (!removed) {
    return {
      ok: false,
      message:
        'Nothing was removed — that account has finished enrolment, or is already gone. Reload the page.',
    };
  }

  /*
   * `beforeState` carries who this was, because the row it describes no longer
   * exists to be looked up. Neither field is a secret: the roster showed both
   * to every admin already.
   */
  await recordAudit({
    actorType: 'admin',
    actorId,
    action: 'admin.removed',
    resourceType: 'admin_user',
    resourceId: String(removed.id),
    beforeState: {
      email: removed.email,
      name: removed.name,
      isActive: false,
      totpEnabled: false,
    },
  });

  revalidatePath('/admin/security');

  return { ok: true, message: `${removed.email} removed.` };
}
