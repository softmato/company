/**
 * Email for the client portal: invitations, new messages, work to review.
 *
 * The record is always written first; mail is the notification, never the
 * record (`sendEmail` never throws). Message and review mail goes out in
 * `after()`, so a slow provider never holds up the page that posted it.
 */
import 'server-only';
import { after } from 'next/server';
import { and, eq, isNotNull } from 'drizzle-orm';

import { clientUsers, clients, db, projects } from '@softmato/db';

import { env } from '@/lib/env';
import { sendEmail, type SendResult } from '@/lib/email/send';
import {
  portalInvitationEmail,
  portalMessageEmail,
  portalReviewEmail,
} from '@/lib/email/templates/portal';
import { expiresIn } from '@/lib/format/date';

import { portalBaseUrl } from './invite';

export async function emailInvite(input: {
  email: string;
  name: string;
  clientName: string;
  url: string;
  expiresAt: Date;
  reset: boolean;
}): Promise<SendResult> {
  return sendEmail({
    to: input.email,
    template: portalInvitationEmail({
      name: input.name,
      clientName: input.clientName,
      url: input.url,
      expiresIn: expiresIn(input.expiresAt),
      reset: input.reset,
    }),
  });
}

async function projectContext(projectId: number) {
  const [row] = await db
    .select({
      projectName: projects.name,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId))
    .limit(1);
  return row ?? null;
}

/** Everyone at the client who can actually sign in. */
async function clientRecipients(clientId: number): Promise<string[]> {
  const rows = await db
    .select({ email: clientUsers.email })
    .from(clientUsers)
    .where(
      and(
        eq(clientUsers.clientId, clientId),
        eq(clientUsers.isActive, true),
        isNotNull(clientUsers.passwordHash),
      ),
    );
  return rows.map((r) => r.email);
}

const projectUrl = (projectId: number) =>
  `${portalBaseUrl()}/projects/${projectId}`;

export function notifyClientOfMessage(
  projectId: number,
  authorName: string,
  body: string,
): void {
  after(async () => {
    const ctx = await projectContext(projectId);
    if (!ctx) return;
    const to = await clientRecipients(ctx.clientId);
    if (to.length === 0) return;

    const result = await sendEmail({
      to,
      template: portalMessageEmail({
        to: 'client',
        authorName,
        body,
        url: projectUrl(projectId),
        ...ctx,
      }),
    });
    if (!result.sent)
      console.warn(
        `[portal] message mail for project ${projectId} not sent — ${result.reason}`,
      );
  });
}

export function notifyCompanyOfMessage(
  projectId: number,
  authorName: string,
  body: string,
): void {
  if (!env.COMPANY_EMAIL) return;
  const company = env.COMPANY_EMAIL;
  const adminBase = (env.AUTH_URL ?? env.NEXT_PUBLIC_APP_URL).replace(
    /\/$/,
    '',
  );

  after(async () => {
    const ctx = await projectContext(projectId);
    if (!ctx) return;

    const result = await sendEmail({
      to: company,
      template: portalMessageEmail({
        to: 'company',
        authorName,
        body,
        url: `${adminBase}/admin/projects/${projectId}#messages`,
        ...ctx,
      }),
    });
    if (!result.sent)
      console.warn(
        `[portal] company mail for project ${projectId} not sent — ${result.reason}`,
      );
  });
}

export function notifyReviewRequested(projectId: number, title: string): void {
  after(async () => {
    const ctx = await projectContext(projectId);
    if (!ctx) return;
    const to = await clientRecipients(ctx.clientId);
    if (to.length === 0) return;

    const result = await sendEmail({
      to,
      template: portalReviewEmail({
        projectName: ctx.projectName,
        title,
        url: projectUrl(projectId),
      }),
    });
    if (!result.sent)
      console.warn(
        `[portal] review mail for project ${projectId} not sent — ${result.reason}`,
      );
  });
}
