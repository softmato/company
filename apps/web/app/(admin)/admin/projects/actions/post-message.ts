'use server';

import { eq } from 'drizzle-orm';

import { adminUsers, db, projectMessages } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import { field, idField, touchProject } from '@/lib/clients/action-kit';
import { notifyClientOfMessage } from '@/lib/portal/notify';

export interface AdminMessageState {
  error?: string;
  sent?: number;
}

export async function postAdminMessageAction(
  _prev: AdminMessageState,
  formData: FormData,
): Promise<AdminMessageState> {
  const adminId = await requireAdmin();
  const projectId = idField(formData, 'projectId');
  const body = field(formData, 'body', 5001);

  if (!projectId) return { error: 'That project could not be found.' };
  if (!body) return { error: 'Write a message first.' };
  if (body.length > 5000)
    return { error: 'Keep a message under 5,000 characters.' };

  const [message] = await db
    .insert(projectMessages)
    .values({ projectId, author: 'admin', adminUserId: Number(adminId), body })
    .returning({ id: projectMessages.id });

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.message_post',
    resourceType: 'project',
    resourceId: String(projectId),
    afterState: { messageId: message?.id },
  });

  const [admin] = await db
    .select({ name: adminUsers.name })
    .from(adminUsers)
    .where(eq(adminUsers.id, Number(adminId)));
  notifyClientOfMessage(projectId, admin?.name ?? 'Softmato', body);

  await touchProject(projectId);
  return { sent: Date.now() };
}
