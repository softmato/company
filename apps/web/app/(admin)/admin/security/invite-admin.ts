'use server';

import { revalidatePath } from 'next/cache';

import { recordAudit } from '@/lib/audit';
import {
  createPendingAdmin,
  reclaimPendingAdmin,
} from '@/lib/enrolment/queries';
import { hashPassword, passwordMinLength } from '@/lib/password.core';

import { requireAdmin } from '../cms/actions/shared';
import { buildHandoff, type Handoff } from './handoff';
import { reauthenticate } from './reauth';

export interface InviteResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  handoff?: Handoff;
}

/** Deliberately loose. The database owns uniqueness; this only catches typos. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Adds a second admin from the dashboard — the UI equivalent of
 * `pnpm admin:create`, and it must stay equivalent.
 *
 * ## Why the QR here is the *link*, not the new admin's TOTP secret
 *
 * The obvious design is to show the invitee's authenticator QR right here and
 * have them scan it over your shoulder. It cannot be done: rendering their
 * TOTP secret on the inviter's screen hands the inviter a permanent second
 * factor for an account that is not theirs. From then on either founder can
 * sign in as the other, and every `audit_logs` row naming admin #2 stops
 * meaning "admin #2 did this" — which is the entire value of the log.
 *
 * So this action mints an enrolment token and returns a QR of the *URL*. The
 * invitee scans it with a phone camera, lands on `/enrol` on their own device,
 * and the secret is generated there, seen only by them, and confirmed with a
 * code before anything is written. Identical to the link the CLI prints.
 *
 * ## Re-issuing
 *
 * Inviting an address that already has an account is only an error when that
 * account is a real, enrolled admin. An address that was invited before and
 * never finished setup is the common case — the QR is shown once and is easy
 * to lose — so that re-issues: the row is reclaimed with whatever name and
 * password were just typed, and a fresh token is minted against it. See
 * `reclaimPendingAdmin`, whose `where` clause is what makes it impossible for
 * this to touch an enrolled admin.
 *
 * ## Why re-authentication
 *
 * Creating an admin is the highest-privilege act in the system: it mints a
 * credential that outlives the session that made it. Same bar as
 * `changePassword` and `rotateTotp` — password *and* a live TOTP code, so an
 * unattended laptop is not enough to add a founder.
 */
export async function inviteAdmin(
  _previous: InviteResult | undefined,
  form: FormData,
): Promise<InviteResult> {
  const adminId = await requireAdmin();
  const id = Number(adminId);

  const currentPassword = String(form.get('current_password') ?? '');
  const currentCode = String(form.get('current_code') ?? '');

  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const name = String(form.get('name') ?? '').trim();
  const password = String(form.get('password') ?? '');

  const minimum = passwordMinLength();
  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = 'Enter the name this person signs in under.';
  if (!EMAIL.test(email)) fieldErrors.email = 'Enter a complete email address.';
  if (password.length < minimum) {
    fieldErrors.password = `Use at least ${minimum} characters.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const me = await reauthenticate(id, currentPassword, currentCode);

  if (!me.ok) {
    await recordAudit({
      actorType: 'admin',
      actorId: adminId,
      action: 'admin.invite_failed',
      resourceType: 'admin_user',
      resourceId: adminId,
      afterState: { reason: 'reauth_failed' },
    });

    return {
      ok: false,
      message: 'Your password or code was wrong. No account was created.',
    };
  }

  /*
   * Hashed before the insert so the plaintext never reaches the row, and never
   * leaves this function. It is handed over out of band, by whoever typed it.
   */
  const passwordHash = await hashPassword(password);
  const created = await createPendingAdmin({ email, name, passwordHash });

  /* Taken, but possibly by someone who never enrolled — see the note above. */
  const subject =
    created ?? (await reclaimPendingAdmin({ email, name, passwordHash }));

  if (!subject) {
    return {
      ok: false,
      fieldErrors: {
        email: 'An enrolled admin already uses that address.',
      },
    };
  }

  const reissued = created === null;
  const handoff = await buildHandoff(subject, reissued);

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: reissued ? 'admin.invite_reissued' : 'admin.invited',
    resourceType: 'admin_user',
    resourceId: String(subject.id),
    afterState: { email, name, isActive: false, totpEnabled: false },
  });

  revalidatePath('/admin/security');

  return { ok: true, handoff };
}
