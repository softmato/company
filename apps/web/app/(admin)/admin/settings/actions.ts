'use server';

import { revalidatePath } from 'next/cache';
import { db, platformSettings } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { SETTING_DEFINITIONS } from '@/lib/settings/definitions';
import { validate } from '@/lib/settings/registry';
import { getStoredSettings } from '@/lib/settings/queries';

import { requireAdmin } from '../cms/actions/shared';

export interface SettingsResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Saves the settings form.
 *
 * Validates everything before writing anything: a form with one bad number
 * saves nothing, so the platform never ends up half-updated with an invoice
 * term from the new policy and a grace period from the old one.
 *
 * Only keys in the definitions are considered — an extra field in the POST
 * body is ignored rather than stored.
 */
export async function saveSettings(
  _previous: SettingsResult | undefined,
  form: FormData,
): Promise<SettingsResult> {
  const adminId = await requireAdmin();

  const fieldErrors: Record<string, string> = {};
  const accepted = new Map<string, string>();

  for (const definition of SETTING_DEFINITIONS) {
    /*
     * `getAll` and take the last: a checkbox is posted behind a hidden 'false'
     * so that unchecking it says something rather than nothing, and `get`
     * would return the hidden value even when the box is ticked.
     */
    const submitted = form.getAll(definition.key).at(-1);
    if (submitted === undefined) continue;

    const result = validate(definition.key, String(submitted));
    if (!result.ok) {
      fieldErrors[definition.key] = result.message;
      continue;
    }

    accepted.set(definition.key, result.value);
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Nothing was saved.', fieldErrors };
  }

  const before = await getStoredSettings();
  const changed = [...accepted].filter(
    ([key, value]) => (before.get(key) ?? null) !== value,
  );

  if (changed.length === 0) {
    return { ok: true, message: 'No changes to save.' };
  }

  for (const [key, value] of changed) {
    await db
      .insert(platformSettings)
      .values({ key, value, updatedBy: Number(adminId) })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedBy: Number(adminId), updatedAt: new Date() },
      });
  }

  /*
   * One audit entry for the save, listing what moved. These numbers decide
   * when a customer is suspended and how much VAT is charged — "who changed
   * the grace period" has to have an answer.
   */
  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'settings.save',
    resourceType: 'platform_settings',
    resourceId: changed.map(([key]) => key).join(','),
    beforeState: Object.fromEntries(
      changed.map(([key]) => [key, before.get(key) ?? null]),
    ),
    afterState: Object.fromEntries(changed),
  });

  revalidatePath('/admin/settings');

  return {
    ok: true,
    message: `Saved ${changed.length} ${changed.length === 1 ? 'change' : 'changes'}.`,
  };
}
