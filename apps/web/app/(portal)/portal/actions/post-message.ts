'use server';

import { revalidatePath } from 'next/cache';

import { db, projectMessages } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { notifyCompanyOfMessage } from '@/lib/portal/notify';
import { clientOwnsProject } from '@/lib/portal/queries';
import { requireViewer } from '@/lib/portal/session';

export interface MessageState {
  error?: string;
  /** Bumped on success so the composer can clear itself. */
  sent?: number;
}

export async function postMessage(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const viewer = await requireViewer();
  const projectId = Number(formData.get('projectId'));
  const body = String(formData.get('body') ?? '').trim();

  if (!body) return { error: 'Write a message first.' };
  if (body.length > 5000)
    return { error: 'Keep a message under 5,000 characters.' };

  if (
    !Number.isInteger(projectId) ||
    !(await clientOwnsProject(viewer.clientId, projectId))
  ) {
    return { error: 'That project could not be found.' };
  }

  const [message] = await db
    .insert(projectMessages)
    .values({ projectId, author: 'client', clientUserId: viewer.userId, body })
    .returning({ id: projectMessages.id });

  await recordAudit({
    actorType: 'client',
    actorId: String(viewer.userId),
    action: 'portal.message_posted',
    resourceType: 'project',
    resourceId: String(projectId),
    afterState: { messageId: message?.id },
  });

  notifyCompanyOfMessage(projectId, viewer.name, body);

  revalidatePath(`/portal/projects/${projectId}`);
  return { sent: Date.now() };
}
