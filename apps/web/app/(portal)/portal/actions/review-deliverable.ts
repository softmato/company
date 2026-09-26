'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db, projectDeliverables, projectMessages } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { notifyCompanyOfMessage } from '@/lib/portal/notify';
import { clientDeliverable } from '@/lib/portal/queries';
import { requireViewer } from '@/lib/portal/session';

export interface ReviewState {
  error?: string;
}

/**
 * Approve a deliverable, or send it back with a note.
 *
 * Only a deliverable Softmato has marked "in review" can be decided, and only
 * once per round: the update is conditional on that status, so a double
 * submit or two people reviewing at once records one decision.
 */
export async function reviewDeliverable(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const viewer = await requireViewer();
  const deliverableId = Number(formData.get('deliverableId'));
  const decision = formData.get('decision');
  const note = String(formData.get('note') ?? '')
    .trim()
    .slice(0, 4000);

  if (decision !== 'approve' && decision !== 'changes') {
    return { error: 'Choose approve or request changes.' };
  }
  if (decision === 'changes' && !note) {
    return { error: 'Say what should change, so the team can act on it.' };
  }

  const deliverable = Number.isInteger(deliverableId)
    ? await clientDeliverable(viewer.clientId, deliverableId)
    : null;

  if (!deliverable) return { error: 'That deliverable could not be found.' };

  const status = decision === 'approve' ? 'approved' : 'changes_requested';

  const verb = decision === 'approve' ? 'Approved' : 'Asked for changes to';
  const message = note
    ? `${verb} “${deliverable.title}”: ${note}`
    : `${verb} “${deliverable.title}”.`;

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(projectDeliverables)
      .set({ status, reviewedAt: new Date(), reviewedBy: viewer.userId })
      .where(
        and(
          eq(projectDeliverables.id, deliverable.id),
          eq(projectDeliverables.status, 'in_review'),
        ),
      )
      .returning({ id: projectDeliverables.id });

    if (rows.length === 0) return false;

    await tx.insert(projectMessages).values({
      projectId: deliverable.projectId,
      author: 'client',
      clientUserId: viewer.userId,
      body: message,
    });

    await recordAudit(
      {
        actorType: 'client',
        actorId: String(viewer.userId),
        action: `portal.deliverable_${status}`,
        resourceType: 'project_deliverable',
        resourceId: String(deliverable.id),
        beforeState: { status: deliverable.status },
        afterState: { status },
      },
      tx,
    );

    return true;
  });

  if (!updated) {
    return {
      error: 'This has already been reviewed. Refresh to see the latest.',
    };
  }

  notifyCompanyOfMessage(deliverable.projectId, viewer.name, message);

  revalidatePath(`/portal/projects/${deliverable.projectId}`);
  revalidatePath('/portal');
  return {};
}
