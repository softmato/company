/**
 * Re-send a stored delivery to an arbitrary URL, signed the way the job signs.
 *
 * Two jobs, and the second is the reason it exists.
 *
 * **1. The operator's replay.** A consumer whose endpoint was down through all
 * eight attempts has an `abandoned` row and no event. This posts that row's
 * exact stored payload again, re-signed with a fresh timestamp — the same
 * bytes, the same secret, the same headers as `deliver.ts`.
 *
 * **2. Proving the verifier can fail.** Phase 3 acceptance 5 is not satisfied
 * by a receiver that prints VERIFIED; a receiver that prints VERIFIED for
 * *everything* would do that too. The negative cases have to be shown on the
 * wire, so:
 *
 *   --secret <wrong>   sign with something else      → signature_mismatch
 *   --tamper           edit the body after signing   → signature_mismatch
 *   --age 600          backdate the timestamp        → timestamp_too_old
 *   --no-signature     omit the header entirely      → signature_mismatch
 *
 *   pnpm webhook:replay -- --txn TXN-2083/84-00000008 --url http://localhost:4001/webhooks/softmato
 *
 * **It does not touch the database.** `attempts`, `status` and `delivered_at`
 * are the record of what the *job* did; a diagnostic that rewrote them would
 * destroy the evidence it was run to collect. Read-only by design.
 */
import { closeDb, db, applications, webhookDeliveries } from '@softmato/db';
import { desc, eq } from 'drizzle-orm';

import { sign } from '../packages/payment-core/webhooks/signature.ts';

const argv = process.argv.slice(2);
const has = (name: string): boolean => argv.includes(name);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const txn = flag('--txn');
const url = flag('--url') ?? 'http://localhost:4000/webhooks/softmato';
const overrideSecret = flag('--secret');
const age = Number(flag('--age') ?? 0);
const tamper = has('--tamper');
const omitSignature = has('--no-signature');

const rows = await db
  .select({
    payload: webhookDeliveries.payload,
    eventType: webhookDeliveries.eventType,
    status: webhookDeliveries.status,
    createdAt: webhookDeliveries.createdAt,
    secret: applications.webhookSecret,
    clientId: applications.clientId,
  })
  .from(webhookDeliveries)
  .innerJoin(applications, eq(applications.id, webhookDeliveries.applicationId))
  .orderBy(desc(webhookDeliveries.createdAt))
  .limit(200);

const match = txn
  ? rows.find(
      (row) =>
        (row.payload as { transaction_id?: string })?.transaction_id === txn,
    )
  : rows[0];

if (!match) {
  console.error(
    txn
      ? `No delivery found for transaction ${txn}.`
      : 'No deliveries in webhook_deliveries at all.',
  );
  console.error('Run `pnpm webhook:status -- --all` to see what is there.');
  process.exit(1);
}

if (!match.secret) {
  console.error(
    `Application ${match.clientId} has no webhook_secret; nothing can be signed.`,
  );
  process.exit(1);
}

// The bytes the consumer verifies must be the bytes that were signed, so the
// stored payload is stringified once and that string is what is both signed
// and sent. `deliver.ts` does exactly this.
const signedBody = JSON.stringify(match.payload);
const timestamp = Math.floor(Date.now() / 1000) - age;
const signature = sign(overrideSecret ?? match.secret, timestamp, signedBody);

// Tampering happens *after* signing — which is the actual attack: a valid
// signature over a body that is no longer the body being delivered.
const sentBody = tamper
  ? signedBody.replace(/"amount":\s*\d+/, '"amount":999999')
  : signedBody;

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Softmato-Timestamp': String(timestamp),
};

if (!omitSignature) headers['X-Softmato-Signature'] = signature;

console.log(`Replaying ${match.eventType} (row status: ${match.status})`);
console.log(
  `  transaction : ${(match.payload as { transaction_id?: string })?.transaction_id}`,
);
console.log(`  to          : ${url}`);
console.log(
  `  signed with : ${overrideSecret ? 'AN OVERRIDE SECRET (expect rejection)' : 'the application webhook_secret'}`,
);
if (age)
  console.log(
    `  timestamp   : backdated ${age}s (expect timestamp_too_old past 300s)`,
  );
if (tamper)
  console.log(
    '  body        : TAMPERED after signing (expect signature_mismatch)',
  );
if (omitSignature)
  console.log('  signature   : header omitted (expect signature_mismatch)');

try {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: sentBody,
  });

  console.log(`\n  → HTTP ${response.status} ${await response.text()}`);
} catch (error) {
  console.error(`\n  → could not reach ${url}: ${String(error)}`);
  process.exitCode = 1;
}

await closeDb();
