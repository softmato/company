'use server';

import { revalidatePath } from 'next/cache';

import { addDomain, removeDomain } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';

import { requireAdmin } from '../cms/actions/shared';
import { failure, type CredentialResult } from './result';

/**
 * The allowlist, edited.
 *
 * Kept apart from `actions.ts` because these are the only two verbs on this
 * screen that mint nothing and reveal nothing — no secret passes through here,
 * so nothing in this file needs the handover machinery or the
 * re-authentication that guards it.
 *
 * Adding a domain is still a security-relevant change and still writes an
 * audit row; `addDomain` and `removeDomain` do that themselves, so this file
 * stays a thin form-to-argument adapter.
 */

export async function addDomainAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const applicationId = Number(form.get('applicationId'));

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return { ok: false, message: 'Bad application id.' };
  }

  const hostname = String(form.get('hostname') ?? '').trim();

  if (hostname === '') {
    return {
      ok: false,
      message: 'Nothing was added.',
      fieldErrors: { hostname: 'Enter a hostname.' },
    };
  }

  try {
    const created = await addDomain(
      {
        applicationId,
        hostname,
        note: String(form.get('note') ?? '').trim() || null,
      },
      { type: 'admin', id: adminId },
      recordAudit,
    );

    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath('/admin/applications');

    return {
      ok: true,
      message: `${created.hostname} may now receive customers and webhooks.`,
    };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Removal takes effect on sessions that already exist, not only on new ones:
 * the return link is re-checked against this table every time it is drawn.
 */
export async function removeDomainAction(
  _previous: CredentialResult | undefined,
  form: FormData,
): Promise<CredentialResult> {
  const adminId = await requireAdmin();
  const domainId = Number(form.get('domainId'));
  const applicationId = Number(form.get('applicationId'));

  if (!Number.isInteger(domainId) || domainId <= 0) {
    return { ok: false, message: 'Bad domain id.' };
  }

  try {
    await removeDomain(domainId, { type: 'admin', id: adminId }, recordAudit);

    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath('/admin/applications');

    return {
      ok: true,
      message: 'Removed. Return links to it stop rendering immediately.',
    };
  } catch (error) {
    return failure(error);
  }
}
