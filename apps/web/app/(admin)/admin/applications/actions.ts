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
 * `requireAdmin` settles "is there a session". Minting a **live** credential,
 * or reading a live signing key, asks a different question: is the person at
 * the keyboard the account owner. A borrowed laptop carries the session; it
 * does not carry the phone. That is the same class as changing an admin
 * password, so it uses the same check (`../security/reauth`).
 *
 * Sandbox credentials touch no real money and are deliberately cheap to make.
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

/** Password plus a live authenticator code, for the acts that mint or reveal. */
async function confirmIdentity(
  adminId: string,
  form: FormData,
): Promise<CredentialResult | null> {
  const password = String(form.get('password') ?? '');
  const code = String(form.get('code') ?? '');

  if (password === '' || code === '') {
    return {
      ok: false,
      message: 'Nothing happened.',
      fieldErrors: {
        password:
          'Confirm with your password and a code from your authenticator.',
      },
    };
  }

  const me = await reauthenticate(Number(adminId), password, code);

  if (!me.ok) {
    await recordAudit({
      actorType: 'admin',
      actorId: adminId,
      action: 'application.reauth_failed',
      resourceType: 'application',
      afterState: { reason: 'reauth_failed' },
    });

    return {
      ok: false,
      message: 'That password or code was wrong. Nothing changed.',
      fieldErrors: { password: 'Wrong password or code.' },
    };
  }

  return null;
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

/** Reading a live signing key is an audited act behind re-authentication. */
export async function revealWebhookSecretAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = Number(form.get('applicationId'));

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return { ok: false, message: 'Bad application id.' };
  }

  const refused = await confirmIdentity(adminId, form);
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

  const refused = await confirmIdentity(adminId, form);
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
