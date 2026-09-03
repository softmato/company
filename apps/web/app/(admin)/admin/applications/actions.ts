'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { APPLICATION_SCOPES, type ApplicationScope } from '@softmato/db';
import {
  registerApplication,
  revealWebhookSecret,
  revokeApplication,
  rotateSecret,
  rotateWebhookSecret,
  updateApplication,
} from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { credentialGate } from '@/lib/applications/queries';

import { requireAdmin } from '../cms/actions/shared';
import { reauthenticate } from '../security/reauth';
import { failure, type CredentialResult } from './result';

/**
 * SaaS registration and credential lifecycle (docs/API.md §2).
 *
 * The plaintext secret is returned in the action result and rendered once. It
 * is never revalidated into a cache, never written to the audit log, and there
 * is no endpoint that can produce it again — a lost client secret is rotated,
 * not recovered.
 *
 * ## Why some of these re-authenticate
 *
 * `requireAdmin` settles "is there a session". Acting on a **Production**
 * credential asks a different question: is the person at the keyboard the
 * account owner. A borrowed laptop carries the session; it does not carry the
 * phone. That is the same class as changing an admin password, so it uses the
 * same check (`../security/reauth`).
 *
 * ## The gate follows the mode, not the verb
 *
 * It did not always. Revealing a **Sandbox** signing secret cost a password
 * and a TOTP code, while rotating a client secret — which kills a live
 * integration in 24 hours — and revoking an application — which kills one
 * instantly and permanently — cost nothing at all. The CLI was stricter than
 * this screen: `scripts/app-secret.mts` refuses to rotate a live application
 * without an explicit `--yes-live`, precisely so a mistyped id cannot take
 * down production, and the admin panel did it in one click.
 *
 * So the rule now is one sentence:
 *
 *   * **Sandbox** — nothing is gated. Reveal, rotate, revoke, edit. The admin
 *     signed in and passed TOTP to get here; asking again to reveal a test key
 *     is theatre, and theatre teaches people to type their code without
 *     reading the screen.
 *   * **Production** — password and TOTP for everything that can move or break
 *     real money: minting, revealing the signing secret, rotating either
 *     secret, revoking, and changing the scopes or the webhook URL.
 *
 * The mode is read from the database on the request that enforces it, by
 * `confirmIfProduction` below. It is never taken from the form — a gate whose
 * condition the caller supplies is not a gate.
 */

const registerSchema = z.object({
  productId: z.string().min(1, 'Pick a product'),
  name: z.string().min(2, 'Give it a name').max(80),
  isLive: z.boolean(),
  webhookUrl: z
    .string()
    .url('Must be an absolute https URL')
    .startsWith('https://', 'Webhooks are delivered over HTTPS only')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

function readScopes(form: FormData): ApplicationScope[] {
  const submitted = new Set(form.getAll('scopes').map(String));
  return APPLICATION_SCOPES.filter((scope) => submitted.has(scope));
}

/**
 * One domain per line, so an admin can paste a list. Blank lines are dropped;
 * a malformed one is refused by `registerApplication` with the offending text
 * quoted back, rather than silently skipped.
 */
function readDomains(form: FormData): { hostname: string }[] {
  return String(form.get('domains') ?? '')
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((hostname) => ({ hostname }));
}

/**
 * Password plus a live authenticator code, for the acts on a Production
 * credential.
 *
 * **Both refusals are audited, including the empty one.** A submission with no
 * password and no code used to return early and leave no trace, which is
 * backwards: an empty submission against a Production credential is the shape
 * a script makes, and a wrong password is the shape a person makes. The one
 * worth seeing in the log was the one not being written. Same `action` for
 * both, so one query finds them; `reason` tells them apart.
 *
 * `applicationId` is optional only because registration has no row yet — the
 * credential is what this call is about to mint. Everywhere else it is passed,
 * because "somebody failed re-authentication" is not much use without "on
 * what".
 */
async function confirmIdentity(
  adminId: string,
  form: FormData,
  applicationId?: number,
): Promise<CredentialResult | null> {
  const password = String(form.get('password') ?? '');
  const code = String(form.get('code') ?? '');

  const refuse = async (
    reason: 'reauth_missing' | 'reauth_failed',
    result: CredentialResult,
  ): Promise<CredentialResult> => {
    await recordAudit({
      actorType: 'admin',
      actorId: adminId,
      action: 'application.reauth_failed',
      resourceType: 'application',
      resourceId: applicationId === undefined ? null : String(applicationId),
      afterState: { reason },
    });

    return result;
  };

  if (password === '' || code === '') {
    return refuse('reauth_missing', {
      ok: false,
      message: 'Nothing happened.',
      fieldErrors: {
        password:
          'Confirm with your password and a code from your authenticator.',
      },
    });
  }

  const me = await reauthenticate(Number(adminId), password, code);

  if (!me.ok) {
    return refuse('reauth_failed', {
      ok: false,
      message: 'That password or code was wrong. Nothing changed.',
      fieldErrors: { password: 'Wrong password or code.' },
    });
  }

  return null;
}

/**
 * The gate, in one place: **Production re-authenticates, Sandbox does not.**
 *
 * Reads the mode from the row rather than from `form`. Every action here is
 * reachable by anyone who can post to it, so a hidden `isLive` field would let
 * a caller declare their own credential a sandbox one and skip the check. The
 * extra query is the price of the guarantee.
 *
 * Returns `null` to mean "proceed" and a `CredentialResult` to mean "stop and
 * show this", matching `confirmIdentity`, so a call site is one `if`.
 */
async function confirmIfProduction(
  applicationId: number,
  adminId: string,
  form: FormData,
): Promise<CredentialResult | null> {
  const gate = await credentialGate(applicationId);

  if (!gate) return { ok: false, message: 'Bad application id.' };

  if (!gate.isLive) return null;

  return confirmIdentity(adminId, form, applicationId);
}

/**
 * Typing the application's name to confirm a revocation.
 *
 * This is **not** a second factor and is not a substitute for one — it proves
 * nothing about who is at the keyboard. It guards a different failure: the
 * right person revoking the wrong application. Revocation is immediate and
 * cannot be undone by re-enabling; the integration needs a whole new
 * registration and a new client id. A name that has to be read off the screen
 * and typed makes a misclick on the wrong row visible before it is fatal.
 *
 * So it applies to Sandbox as well as Production. "Sandbox is not gated" is
 * about re-authentication, and this is not that.
 */
function confirmName(
  form: FormData,
  expected: string,
): CredentialResult | null {
  const typed = String(form.get('confirmName') ?? '').trim();

  if (typed === expected.trim()) return null;

  return {
    ok: false,
    message: 'Nothing was revoked.',
    fieldErrors: {
      confirmName: `Type the application's name exactly — "${expected}" — to confirm.`,
    },
  };
}

export async function registerApplicationAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();

  const parsed = registerSchema.safeParse({
    productId: String(form.get('productId') ?? ''),
    name: String(form.get('name') ?? '').trim(),
    isLive: form.get('isLive') === 'true',
    webhookUrl: String(form.get('webhookUrl') ?? '').trim(),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Nothing was created.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join('.'),
          issue.message,
        ]),
      ),
    };
  }

  const scopes = readScopes(form);

  if (scopes.length === 0) {
    return {
      ok: false,
      message: 'Nothing was created.',
      fieldErrors: { scopes: 'An application with no scopes can do nothing.' },
    };
  }

  const domains = readDomains(form);

  if (domains.length === 0) {
    return {
      ok: false,
      message: 'Nothing was created.',
      fieldErrors: {
        domains:
          'List at least one domain. Until one exists the application cannot be given a return URL or a webhook address, so it could not be used anyway.',
      },
    };
  }

  if (parsed.data.isLive) {
    const refused = await confirmIdentity(adminId, form);
    if (refused) return refused;
  }

  try {
    const { application, secret } = await registerApplication(
      {
        productId: parsed.data.productId,
        name: parsed.data.name,
        scopes,
        webhookUrl: parsed.data.webhookUrl ?? null,
        isLive: parsed.data.isLive,
        domains,
      },
      { type: 'admin', id: adminId },
      recordAudit,
    );

    /*
     * The webhook secret is read straight back rather than returned from
     * `registerApplication`, so both credentials reach the handover screen
     * through the same audited path — a reveal is a reveal even on the day the
     * application was made.
     */
    const webhookSecret = application.webhookUrl
      ? await revealWebhookSecret(
          application.id,
          { type: 'admin', id: adminId },
          recordAudit,
        )
      : undefined;

    revalidatePath('/admin/applications');
    revalidatePath('/admin/products');

    return {
      ok: true,
      message: 'Registered. Copy both secrets now — neither is shown again.',
      secret,
      clientId: application.clientId,
      applicationId: application.id,
      ...(webhookSecret !== undefined ? { webhookSecret } : {}),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function rotateSecretAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = Number(form.get('applicationId'));

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return { ok: false, message: 'Bad application id.' };
  }

  /*
   * A rotation kills the integration in 24 hours: the superseded secret keeps
   * working for the overlap and then stops. On Production that is the second
   * most destructive thing on this screen and it used to cost nothing.
   */
  const refused = await confirmIfProduction(applicationId, adminId, form);
  if (refused) return refused;

  try {
    const result = await rotateSecret(
      applicationId,
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/applications');

    return {
      ok: true,
      message: 'Rotated. The old secret keeps working for 24 hours.',
      secret: result.secret,
      clientId: result.application.clientId,
      previousSecretExpiresAt: result.previousSecretExpiresAt.toISOString(),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeApplicationAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = Number(form.get('applicationId'));

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return { ok: false, message: 'Bad application id.' };
  }

  const gate = await credentialGate(applicationId);

  if (!gate) return { ok: false, message: 'Bad application id.' };

  /*
   * The name first, then the identity check. Both are refusals that change
   * nothing, and asking for a password before telling the admin they are on
   * the wrong row wastes a TOTP code on a mistake.
   */
  const mistyped = confirmName(form, gate.name);
  if (mistyped) return mistyped;

  if (gate.isLive) {
    const refused = await confirmIdentity(adminId, form, applicationId);
    if (refused) return refused;
  }

  try {
    await revokeApplication(
      applicationId,
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/applications');
    revalidatePath('/admin/products');

    return {
      ok: true,
      message: 'Revoked. Every secret for it stopped working.',
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateApplicationAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = Number(form.get('applicationId'));

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return { ok: false, message: 'Bad application id.' };
  }

  const scopes = readScopes(form);

  if (scopes.length === 0) {
    return {
      ok: false,
      message: 'Nothing was saved.',
      fieldErrors: { scopes: 'An application with no scopes can do nothing.' },
    };
  }

  /*
   * Editing looks harmless beside rotating and revoking, and is not: this form
   * can narrow the scopes an integration depends on, or point its webhook at a
   * different registered host. Both are silent — nothing fails until the next
   * call or the next delivery.
   */
  const refused = await confirmIfProduction(applicationId, adminId, form);
  if (refused) return refused;

  try {
    /*
     * The https and registered-host checks are not repeated here.
     * `updateApplication` runs `assertRegisteredHost` inside its transaction,
     * which is the one place that decides what an acceptable destination is —
     * a second opinion in this file is a second thing to forget to update.
     */
    await updateApplication(
      applicationId,
      {
        scopes,
        webhookUrl: String(form.get('webhookUrl') ?? '').trim() || null,
      },
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/applications');

    return { ok: true, message: 'Saved.' };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Reading a Production signing key is an audited act behind re-authentication.
 * Reading a Sandbox one is a lookup, and is now treated as one — the audit
 * entry is written either way.
 */
export async function revealWebhookSecretAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = Number(form.get('applicationId'));

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return { ok: false, message: 'Bad application id.' };
  }

  const refused = await confirmIfProduction(applicationId, adminId, form);
  if (refused) return refused;

  try {
    const webhookSecret = await revealWebhookSecret(
      applicationId,
      { type: 'admin', id: adminId },
      recordAudit,
    );

    return {
      ok: true,
      message: 'This is the signing secret. Reading it was recorded.',
      webhookSecret,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function rotateWebhookSecretAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = Number(form.get('applicationId'));

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return { ok: false, message: 'Bad application id.' };
  }

  const refused = await confirmIfProduction(applicationId, adminId, form);
  if (refused) return refused;

  try {
    const webhookSecret = await rotateWebhookSecret(
      applicationId,
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/applications');

    return {
      ok: true,
      message:
        'Rotated. There is no overlap on a signing secret — deliveries signed with the old one will fail until the consumer is redeployed.',
      webhookSecret,
    };
  } catch (error) {
    return failure(error);
  }
}
