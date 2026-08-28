'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { APPLICATION_SCOPES, type ApplicationScope } from '@softmato/db';
import {
  isPaymentError,
  registerApplication,
  revokeApplication,
  rotateSecret,
  updateApplication,
} from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';

import { requireAdmin } from '../cms/actions/shared';

/**
 * SaaS registration and credential lifecycle (docs/API.md §2).
 *
 * The plaintext secret is returned in the action result and rendered once.
 * It is never revalidated into a cache, never written to the audit log, and
 * there is no endpoint that can produce it again — a lost secret is rotated,
 * not recovered.
 */

export interface CredentialResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Shown once, immediately after issue or rotation. */
  secret?: string;
  clientId?: string;
  /** When a rotated-away secret stops working. */
  previousSecretExpiresAt?: string;
}

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

/** Turns a thrown error into a message without leaking internals. */
function failure(error: unknown): CredentialResult {
  console.error(
    JSON.stringify({
      level: 'error',
      action: 'admin.application',
      message: error instanceof Error ? error.message : String(error),
    }),
  );

  if (isPaymentError(error)) {
    return { ok: false, message: error.publicMessage };
  }

  return { ok: false, message: 'That did not work, so nothing changed.' };
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

  try {
    const { application, secret } = await registerApplication(
      {
        productId: parsed.data.productId,
        name: parsed.data.name,
        scopes,
        webhookUrl: parsed.data.webhookUrl ?? null,
        isLive: parsed.data.isLive,
      },
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/products');

    return {
      ok: true,
      message: 'Registered. Copy the secret now — it is not shown again.',
      secret,
      clientId: application.clientId,
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

    revalidatePath('/admin/products');

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

    revalidatePath('/admin/products');

    return { ok: true, message: 'Revoked. Every secret for it stopped working.' };
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

  const webhookUrl = String(form.get('webhookUrl') ?? '').trim();

  if (webhookUrl && !webhookUrl.startsWith('https://')) {
    return {
      ok: false,
      message: 'Nothing was saved.',
      fieldErrors: { webhookUrl: 'Webhooks are delivered over HTTPS only.' },
    };
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
    await updateApplication(
      applicationId,
      { scopes, webhookUrl: webhookUrl || null },
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath('/admin/products');

    return { ok: true, message: 'Saved.' };
  } catch (error) {
    return failure(error);
  }
}
