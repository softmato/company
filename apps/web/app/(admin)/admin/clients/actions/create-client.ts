'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import { databaseMessage, field } from '@/lib/clients/action-kit';
import { createClient } from '@/lib/clients/create';
import { issueInvite } from '@/lib/portal/invite';
import { emailInvite } from '@/lib/portal/notify';

export interface InviteState {
  error?: string;
  invite?: {
    url: string;
    expiresAt: string;
    name: string;
    email: string;
    /** Set when the admin asked for the link to be emailed. */
    emailed?: boolean | undefined;
    emailError?: string | undefined;
  };
  clientId?: number;
}

const schema = z.object({
  name: z.string().min(1, 'Enter the company or client name.'),
  contactName: z.string().min(1, 'Enter the contact person’s name.'),
  contactEmail: z.string().email('Enter a complete email address.'),
});

export async function createClientAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const adminId = await requireAdmin();

  const parsed = schema.safeParse({
    name: field(formData, 'name', 200),
    contactName: field(formData, 'contactName', 200),
    contactEmail: field(formData, 'contactEmail', 320).toLowerCase(),
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
    };

  try {
    const { clientId, userId } = await createClient(parsed.data);
    const invite = await issueInvite(userId);

    await recordAudit({
      actorType: 'admin',
      actorId: adminId,
      action: 'client.create',
      resourceType: 'client',
      resourceId: String(clientId),
      afterState: {
        name: parsed.data.name,
        contactEmail: parsed.data.contactEmail,
      },
    });

    const mail =
      formData.get('emailInvite') === 'on'
        ? await emailInvite({
            email: parsed.data.contactEmail,
            name: parsed.data.contactName,
            clientName: parsed.data.name,
            url: invite.url,
            expiresAt: invite.expiresAt,
            reset: false,
          })
        : null;

    revalidatePath('/admin/clients');
    return {
      clientId,
      invite: {
        url: invite.url,
        expiresAt: invite.expiresAt.toISOString(),
        name: parsed.data.contactName,
        email: parsed.data.contactEmail,
        emailed: mail?.sent,
        emailError: mail && !mail.sent ? mail.reason : undefined,
      },
    };
  } catch (error) {
    return { error: databaseMessage(error) };
  }
}
