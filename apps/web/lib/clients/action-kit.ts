/**
 * The small pieces every admin client/project action repeats: reading form
 * fields, turning a database refusal into a sentence, and telling both the
 * admin and the portal that a project changed.
 */
import 'server-only';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db, projects } from '@softmato/db';

export interface FormState {
  error?: string;
  /** Bumped on success, so a form can clear itself. */
  ok?: number;
}

export const done = (): FormState => ({ ok: Date.now() });

export function field(formData: FormData, name: string, max = 500): string {
  return String(formData.get(name) ?? '')
    .trim()
    .slice(0, max);
}

export function idField(formData: FormData, name: string): number | null {
  const id = Number(formData.get(name));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** `YYYY-MM-DD` from a date input, or null when left blank. */
export function dateField(
  formData: FormData,
  name: string,
): string | null | 'invalid' {
  const value = field(formData, name, 20);
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : 'invalid';
}

/** An https (or http) link, or null when blank. */
export function linkField(
  formData: FormData,
  name: string,
): string | null | 'invalid' {
  const value = field(formData, name, 2000);
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : 'invalid';
  } catch {
    return 'invalid';
  }
}

export function databaseMessage(error: unknown): string {
  const text = `${error instanceof Error ? error.message : String(error)} ${String((error as { cause?: unknown })?.cause ?? '')}`;

  if (text.includes('project_dates_ordered'))
    return 'The due date must be on or after the start date.';
  if (text.includes('projects_preview_slug_unique'))
    return 'Another project already uses that preview address.';
  if (text.includes('client_users_email_unique'))
    return 'Someone with that email already has a portal account.';
  if (text.includes('_present')) return 'A name is required.';
  return 'The database refused that change, so nothing was saved.';
}

/**
 * Marks a project as just changed (its place in the client's list follows
 * `updated_at`) and refreshes every page that shows it.
 */
export async function touchProject(projectId: number): Promise<void> {
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
  revalidatePath('/portal');
}
