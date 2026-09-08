'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  APPLICATION_SCOPES,
  type ApplicationScope,
  type CredentialMode,
} from '@softmato/db';
import {
  addCredential,
  registerApplication,
  revealWebhookSecret,
  revokeCredential,
  rotateSecret,
  rotateWebhookSecret,
  setCredentialWebhookUrl,
  updateApplication,
} from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { applicationGate, credentialGate } from '@/lib/applications/queries';

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
 * ## What these act on
 *
 * An application holds up to two credential sets, Sandbox and Production, and
 * almost everything here addresses a **credential**: rotating, revoking,
 * revealing a signing key, setting a webhook URL. Only the name and the scopes
 * belong to the application, because those describe what the integration is
 * rather than how it authenticates.
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
 * integration in 24 hours — and revoking one — which kills it instantly and
 * permanently — cost nothing at all. The CLI was stricter than this screen:
 * `scripts/app-secret.mts` refuses to rotate a live credential without an
 * explicit `--yes-live`, precisely so a mistyped id cannot take down
 * production, and the admin panel did it in one click.
 *
 * So the rule is one sentence:
 *
 *   * **Sandbox** — nothing is gated. Reveal, rotate, revoke, edit. The admin
 *     signed in and passed TOTP to get here; asking again to reveal a test key
 *     is theatre, and theatre teaches people to type their code without
 *     reading the screen.
 *   * **Production** — password and TOTP for everything that can move or break
 *     real money: minting, revealing the signing secret, rotating either
 *     secret, revoking, changing the webhook URL, and changing the scopes.
 *
 * The mode is read from the database on the request that enforces it. It is
 * never taken from the form — a gate whose condition the caller supplies is
 * not a gate.
 */

const registerSchema = z.object({
  productId: z.string().min(1, 'Pick a product'),
  name: z.string().min(2, 'Give it a name').max(80),
  mode: z.enum(['test', 'live']),
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

function readId(form: FormData, field: string): number | null {
  const id = Number(form.get(field));
  return Number.isInteger(id) && id > 0 ? id : null;
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
 */
async function confirmIdentity(
  adminId: string,
  form: FormData,
  resourceId?: number,
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
      resourceId: resourceId === undefined ? null : String(resourceId),
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
 * reachable by anyone who can post to it, so a hidden mode field would let a
 * caller declare their own credential a sandbox one and skip the check. The
 * extra query is the price of the guarantee.
 *
 * Returns `null` to mean "proceed" and a `CredentialResult` to mean "stop and
 * show this", matching `confirmIdentity`, so a call site is one `if`.
 */
async function confirmIfProduction(
  credentialId: number,
  adminId: string,
  form: FormData,
): Promise<CredentialResult | null> {
  const gate = await credentialGate(credentialId);

  if (!gate) return { ok: false, message: 'Bad credential id.' };

  if (!gate.isLive) return null;

  return confirmIdentity(adminId, form, credentialId);
}

/**
 * Typing the application's name to confirm a revocation.
 *
 * This is **not** a second factor and is not a substitute for one — it proves
 * nothing about who is at the keyboard. It guards a different failure: the
 * right person revoking the wrong credential. Revocation is immediate and
 * cannot be undone; the integration needs a whole new credential and a new
 * client id. A name that has to be read off the screen and typed makes a
 * misclick on the wrong row visible before it is fatal.
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

  /*
   * The mode is not read from the form, and there is no field to read.
   * Registration mints Sandbox; Production is minted from the application's
   * own page, where `confirmIfProduction` asks for a password and a code.
   *
   * Hard-coded rather than defaulted, deliberately. A default is something a
   * caller can override, and this endpoint is reachable by anyone who can
   * post to it — a `mode=live` field on a form that no longer draws one
   * would be a way to mint a production credential with no re-authentication
   * at all.
   */
  const parsed = registerSchema.safeParse({
    productId: String(form.get('productId') ?? ''),
    name: String(form.get('name') ?? '').trim(),
    mode: 'test',
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
          'List at least one domain. Until one exists the credential cannot be given a return URL or a webhook address, so it could not be used anyway.',
      },
    };
  }

  try {
    const { application, credential, secret } = await registerApplication(
      {
        productId: parsed.data.productId,
        name: parsed.data.name,
        scopes,
        webhookUrl: parsed.data.webhookUrl ?? null,
        mode: parsed.data.mode,
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
    const webhookSecret = credential.webhookUrl
      ? await revealWebhookSecret(
          credential.id,
          { type: 'admin', id: adminId },
          recordAudit,
        )
      : undefined;

    revalidatePath('/admin/applications');
    revalidatePath('/admin/products');

    return {
      ok: true,
      message:
        'Registered with a Sandbox credential. Copy both secrets now — neither is shown again.',
      secret,
      clientId: credential.clientId,
      applicationId: application.id,
      credentialId: credential.id,
      ...(webhookSecret !== undefined ? { webhookSecret } : {}),
    };
  } catch (error) {
    return failure(error);
  }
}

/**
 * The second credential set, minted from the application's own page.
 *
 * This is what the split is for: register once, get a Sandbox credential, add
 * Production when the integration is ready. Minting Production costs a
 * password and a code; minting Sandbox does not.
 */
export async function addCredentialAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = readId(form, 'applicationId');

  if (applicationId === null) {
    return { ok: false, message: 'Bad application id.' };
  }

  const mode: CredentialMode = form.get('mode') === 'live' ? 'live' : 'test';

  if (mode === 'live') {
    const refused = await confirmIdentity(adminId, form, applicationId);
    if (refused) return refused;
  }

  try {
    const { credential, secret } = await addCredential(
      applicationId,
      mode,
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/applications');

    return {
      ok: true,
      message:
        'Created. Copy the secret now — it is not shown again. Add this credential’s domains before it can be used.',
      secret,
      clientId: credential.clientId,
      applicationId,
      credentialId: credential.id,
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
  const credentialId = readId(form, 'credentialId');

  if (credentialId === null) {
    return { ok: false, message: 'Bad credential id.' };
  }

  /*
   * A rotation kills the integration in 24 hours: the superseded secret keeps
   * working for the overlap and then stops. On Production that is the second
   * most destructive thing on this screen and it used to cost nothing.
   */
  const refused = await confirmIfProduction(credentialId, adminId, form);
  if (refused) return refused;

  try {
    const result = await rotateSecret(
      credentialId,
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/applications');

    return {
      ok: true,
      message: 'Rotated. The old secret keeps working for 24 hours.',
      secret: result.secret,
      clientId: result.credential.clientId,
      credentialId,
      previousSecretExpiresAt: result.previousSecretExpiresAt.toISOString(),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeCredentialAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const credentialId = readId(form, 'credentialId');

  if (credentialId === null) {
    return { ok: false, message: 'Bad credential id.' };
  }

  const gate = await credentialGate(credentialId);

  if (!gate) return { ok: false, message: 'Bad credential id.' };

  /*
   * The name first, then the identity check. Both are refusals that change
   * nothing, and asking for a password before telling the admin they are on
   * the wrong row wastes a TOTP code on a mistake.
   */
  const mistyped = confirmName(form, gate.applicationName);
  if (mistyped) return mistyped;

  if (gate.isLive) {
    const refused = await confirmIdentity(adminId, form, credentialId);
    if (refused) return refused;
  }

  try {
    await revokeCredential(
      credentialId,
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/applications');
    revalidatePath('/admin/products');

    return {
      ok: true,
      message:
        'Revoked. This credential stopped working; the other one is untouched.',
    };
  } catch (error) {
    return failure(error);
  }
}

/**
 * The application's own fields. Scopes are shared by both credentials, which
 * is why narrowing them on an application that has a Production credential is
 * gated even though this form never mentions a mode.
 */
export async function updateApplicationAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = readId(form, 'applicationId');

  if (applicationId === null) {
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

  const gate = await applicationGate(applicationId);

  if (!gate) return { ok: false, message: 'Bad application id.' };

  if (gate.hasProduction) {
    const refused = await confirmIdentity(adminId, form, applicationId);
    if (refused) return refused;
  }

  try {
    await updateApplication(
      applicationId,
      { scopes },
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
 * Where this credential's webhooks are delivered.
 *
 * The https and registered-host checks are not repeated here.
 * `setCredentialWebhookUrl` runs `assertRegisteredHost` inside its
 * transaction, which is the one place that decides what an acceptable
 * destination is — a second opinion in this file is a second thing to forget
 * to update.
 */
export async function setWebhookUrlAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const credentialId = readId(form, 'credentialId');

  if (credentialId === null) {
    return { ok: false, message: 'Bad credential id.' };
  }

  const refused = await confirmIfProduction(credentialId, adminId, form);
  if (refused) return refused;

  try {
    await setCredentialWebhookUrl(
      credentialId,
      String(form.get('webhookUrl') ?? '').trim() || null,
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
 * Reading a Sandbox one is a lookup, and is treated as one — the audit entry is
 * written either way.
 */
export async function revealWebhookSecretAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const credentialId = readId(form, 'credentialId');

  if (credentialId === null) {
    return { ok: false, message: 'Bad credential id.' };
  }

  const refused = await confirmIfProduction(credentialId, adminId, form);
  if (refused) return refused;

  try {
    const webhookSecret = await revealWebhookSecret(
      credentialId,
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
  const credentialId = readId(form, 'credentialId');

  if (credentialId === null) {
    return { ok: false, message: 'Bad credential id.' };
  }

  const refused = await confirmIfProduction(credentialId, adminId, form);
  if (refused) return refused;

  try {
    const webhookSecret = await rotateWebhookSecret(
      credentialId,
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
