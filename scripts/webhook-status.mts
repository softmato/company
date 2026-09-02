/**
 * What the outbound webhook queue currently looks like.
 *
 * **Break-glass. The admin panel is the normal path** — `/admin/applications`
 * shows each application's webhook URL, and reveals or rotates its signing
 * secret behind re-authentication, recording the reveal in the audit log.
 *
 * Read-only. Written for Phase 3 acceptance 5, where the question being asked
 * over and over is "did that delivery actually land, or is the page telling me
 * a story" — and the only answer that counts is the row in
 * `webhook_deliveries`: `status`, `last_status_code`, `delivered_at`.
 *
 *   pnpm webhook:status
 *   pnpm webhook:status -- --all      # include delivered/abandoned rows
 *
 * It also prints each application's `webhook_url` and, redacted, whether a
 * `webhook_secret` exists — because the single most common way this demo fails
 * is an application pointing nowhere, or the receiver being started with the
 * client secret instead of the webhook secret. The secret itself is printed
 * only under --reveal, which you need once to start the receiver.
 */
import { closeDb, db, applications, webhookDeliveries } from '@softmato/db';
import { desc, inArray } from 'drizzle-orm';

const argv = process.argv.slice(2);
const all = argv.includes('--all');
const reveal = argv.includes('--reveal');

const apps = await db
  .select({
    clientId: applications.clientId,
    name: applications.name,
    isActive: applications.isActive,
    webhookUrl: applications.webhookUrl,
    webhookSecret: applications.webhookSecret,
  })
  .from(applications);

console.log('APPLICATIONS\n');

for (const app of apps) {
  const secret = app.webhookSecret
    ? reveal
      ? app.webhookSecret
      : `set (${app.webhookSecret.length} chars, --reveal to print)`
    : 'MISSING — nothing can be signed, deliveries will be abandoned';

  console.log(
    `  ${app.clientId}  ${app.isActive ? '' : '(inactive) '}${app.name}`,
  );
  console.log(
    `    webhook_url    : ${app.webhookUrl ?? 'MISSING — nothing to deliver to'}`,
  );
  console.log(`    webhook_secret : ${secret}`);
  console.log('');
}

const rows = await db
  .select({
    id: webhookDeliveries.id,
    eventType: webhookDeliveries.eventType,
    status: webhookDeliveries.status,
    attempts: webhookDeliveries.attempts,
    lastStatusCode: webhookDeliveries.lastStatusCode,
    lastError: webhookDeliveries.lastError,
    nextAttemptAt: webhookDeliveries.nextAttemptAt,
    deliveredAt: webhookDeliveries.deliveredAt,
    createdAt: webhookDeliveries.createdAt,
    payload: webhookDeliveries.payload,
  })
  .from(webhookDeliveries)
  .where(
    all ? undefined : inArray(webhookDeliveries.status, ['pending', 'failed']),
  )
  .orderBy(desc(webhookDeliveries.createdAt))
  .limit(50);

console.log(
  `WEBHOOK DELIVERIES (${all ? 'all' : 'pending + failed only'}) — ${rows.length}\n`,
);

for (const row of rows) {
  const payload = row.payload as { transaction_id?: string } | null;

  console.log(
    `  ${row.status.padEnd(9)} ${row.eventType.padEnd(18)} ` +
      `attempts=${row.attempts} code=${row.lastStatusCode ?? '-'} ` +
      `txn=${payload?.transaction_id ?? '-'}`,
  );
  console.log(
    `    created=${iso(row.createdAt)} next=${iso(row.nextAttemptAt)} delivered=${iso(row.deliveredAt)}`,
  );
  if (row.lastError) console.log(`    error: ${row.lastError}`);
}

if (rows.length === 0) console.log('  (none)');

function iso(value: Date | null): string {
  return value ? value.toISOString() : '-';
}

await closeDb();
