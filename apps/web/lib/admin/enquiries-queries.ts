import 'server-only';

import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { adminUsers, contactSubmissions, db } from '@softmato/db';

export type EnquiryFilter = 'open' | 'handled' | 'all' | 'spam';

export interface EnquiryRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  createdAt: Date;
  handledAt: Date | null;
  handledByName: string | null;
  spamReason: string | null;
}

const real = isNull(contactSubmissions.spamReason);

// Spam lives only under its own filter; everything else is real enquiries.
const WHERE = {
  open: and(real, isNull(contactSubmissions.handledAt)),
  handled: and(real, isNotNull(contactSubmissions.handledAt)),
  all: real,
  spam: isNotNull(contactSubmissions.spamReason),
};

/**
 * Contact-form enquiries, newest first, for /admin/enquiries.
 *
 * Column by column, so the IP hash and user agent stay in the database.
 */
export async function listEnquiries(
  filter: EnquiryFilter,
): Promise<EnquiryRow[]> {
  return (
    db
      .select({
        id: contactSubmissions.id,
        name: contactSubmissions.name,
        email: contactSubmissions.email,
        phone: contactSubmissions.phone,
        subject: contactSubmissions.subject,
        message: contactSubmissions.message,
        createdAt: contactSubmissions.createdAt,
        handledAt: contactSubmissions.handledAt,
        handledByName: adminUsers.name,
        spamReason: contactSubmissions.spamReason,
      })
      .from(contactSubmissions)
      .leftJoin(adminUsers, eq(adminUsers.id, contactSubmissions.handledBy))
      .where(WHERE[filter])
      .orderBy(desc(contactSubmissions.createdAt))
      // ponytail: newest 200 only; add paging when the inbox outgrows it.
      .limit(200)
  );
}

export async function countOpenEnquiries(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contactSubmissions)
    .where(WHERE.open);

  return row?.n ?? 0;
}
