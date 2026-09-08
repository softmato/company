/**
 * Remove test-fixture rows from a production database.
 *
 * ## What went wrong
 *
 * Test fixtures were run against production at some point in August 2026. They
 * do not look like a few stray rows — they are the overwhelming majority of the
 * accounting data:
 *
 * | table              | total | fixtures |
 * | ------------------ | ----- | -------- |
 * | `invoices`         |    93 |       91 |
 * | `payment_sessions` |   444 |      443 |
 * | `transactions`     |   177 |      177 |
 * | `journal_entries`  |   275 |      273 |
 * | `ledger_entries`   |   590 |      588 |
 *
 * They are identifiable without guesswork: the fixtures write **fiscal years
 * that do not exist** — `SESS/00`, `TXN/00`, `TEST/00`, `NUM/00` — where a real
 * one is `2083/84`. Nothing legitimate carries those values, so the delete set
 * is defined by them rather than by a date range or an id range.
 *
 * ## Why this needs a script rather than a few DELETEs
 *
 * `journal_entries` has an immutability trigger (migration 0001, Guarantee 2):
 *
 *     IF TG_OP = 'DELETE' THEN
 *         RAISE EXCEPTION 'Journal entries cannot be deleted'
 *
 * That guarantee exists to stop accounting history being rewritten, and it is
 * correct. It has to be suspended for exactly the statements that remove
 * fixture postings from fiscal periods that were never real, and restored in
 * the same transaction — so a failure anywhere leaves both the data and the
 * guard exactly as they were.
 *
 * Reversing entries would be the accounting-correct answer for a mistaken
 * *posting*. These are not mistaken postings; they are a test suite's output in
 * periods that do not exist, and reversing them would double the noise.
 *
 * ## What is deliberately kept
 *
 * The two invoices in `2083/84` — `INV-2083/84-000001` and `-000002`, sequence
 * numbers 1 and 2 — and their journal entries. Deleting them would leave the
 * document sequence allocated at 2 with no invoices behind it, which is the
 * exact numbering gap `/admin/invoices` warns about: cleaning up would create
 * the fault it is cleaning up after.
 *
 * The single `payment_session` on invoice 1 is also kept. It is Sandbox
 * activity on a real invoice, which is a different question, decided
 * separately.
 *
 * ## Why it retries
 *
 * Production is the **direct** Neon endpoint, not the pooler, and a direct
 * connection is dropped whenever the compute wakes or scales — `57P01`,
 * `admin_shutdown`. The first run of this script died that way mid-count.
 *
 * A dropped connection is safe by construction: everything destructive happens
 * inside one transaction, so an interrupted attempt has already rolled back and
 * starting over is the correct response rather than a risky one. Each attempt
 * therefore takes a fresh connection and redoes the whole thing.
 *
 * ## Running it
 *
 *   Dry run (default) — rolls back, prints everything it would do:
 *     pnpm --filter @softmato/db exec tsx --env-file=D:/company/.env.prod \
 *       ./scripts/clean-production-fixtures.ts
 *
 *   For real:
 *     CONFIRM=yes pnpm --filter @softmato/db exec tsx \
 *       --env-file=D:/company/.env.prod ./scripts/clean-production-fixtures.ts
 *
 * Take a Neon branch first. This one genuinely cannot be undone by re-running
 * anything.
 */
import { Client } from 'pg';

/** Fiscal years the fixtures invent. Nothing real uses these. */
const FAKE_YEARS = ['SESS/00', 'TXN/00', 'TEST/00', 'NUM/00'];

/** The subset of those that appear on `invoices.fiscal_year`. */
const FAKE_INVOICE_YEARS = ['SESS/00', 'TXN/00'];

/** Tables worth showing before and after. */
const COUNTED = [
  'invoices',
  'invoice_lines',
  'payment_sessions',
  'transactions',
  'journal_entries',
  'ledger_entries',
  'fiscal_periods',
] as const;

/**
 * The append-only guards this cleanup has to step around, and nothing more.
 *
 * Migration 0001 installs four (Guarantee 2). Three of them sit on tables the
 * fixture rows occupy. The fourth, `audit_logs_immutable`, is deliberately
 * absent from this list: the audit log is a record of what was done, not data
 * the fixtures created, and a cleanup that quietly erased its own history would
 * be the one thing worse than the mess it is clearing up.
 *
 * `provider_events` currently holds no fixture rows, so its guard would never
 * fire — it is here anyway, because "there happen to be zero rows today" is a
 * fact about the data rather than about the script.
 */
const GUARDS = [
  ['ledger_entries', 'ledger_entries_immutable'],
  ['journal_entries', 'journal_entries_immutable'],
  ['provider_events', 'provider_events_immutable'],
] as const;

/**
 * Connection-level failures worth another attempt.
 *
 * `57P01` is Neon dropping a direct connection when the compute wakes. The
 * others are the same event seen from the socket rather than from Postgres.
 */
const TRANSIENT = new Set([
  '57P01',
  '57P02',
  '57P03',
  '08006',
  '08003',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
]);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error('DATABASE_URL is not set');

const commit = process.env.CONFIRM === 'yes';

function isTransient(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return typeof code === 'string' && TRANSIENT.has(code);
}

/** All the table counts in one round trip, so a wake-up has less to interrupt. */
async function counts(client: Client): Promise<Record<string, string>> {
  const selects = COUNTED.map(
    (t) => `(select count(*) from "${t}")::text as "${t}"`,
  ).join(', ');

  const result = await client.query<Record<string, string>>(
    `select ${selects}`,
  );

  return result.rows[0] ?? {};
}

function printCounts(label: string, row: Record<string, string>) {
  console.log('\n=== ' + label + ' ===');
  for (const t of COUNTED) {
    console.log('  ' + t.padEnd(20) + String(row[t] ?? '?').padStart(6));
  }
}

/**
 * One complete attempt. Either commits, or leaves the database untouched.
 *
 * Returns `false` when there was nothing to do, so the caller does not retry a
 * database that is already clean.
 */
async function runOnce(): Promise<boolean> {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
    keepAlive: true,
    application_name: 'clean-production-fixtures',
  });

  await client.connect();

  try {
    const host = (connectionString!.split('@')[1] ?? '').split('/')[0];
    console.log('target: ' + host);
    console.log(
      'mode:   ' +
        (commit ? 'COMMIT — this will write' : 'DRY RUN — will roll back'),
    );

    /*
     * A guard against pointing this at the wrong database by accident. The
     * script is only meant for a database that still has fixture rows; running
     * it somewhere clean should do nothing rather than something surprising.
     */
    const guardRow = await client.query<{ n: string }>(
      'select count(*)::text n from invoices where fiscal_year = any($1)',
      [FAKE_INVOICE_YEARS],
    );

    if (Number(guardRow.rows[0]?.n ?? 0) === 0) {
      console.log('\nNo fixture invoices here. Nothing to do.');
      return false;
    }

    printCounts('BEFORE', await counts(client));

    await client.query('BEGIN');

    try {
      const run = async (
        label: string,
        sql: string,
        params: unknown[] = [],
      ) => {
        const result = await client.query(sql, params);
        console.log(
          '  deleted ' + label.padEnd(24) + String(result.rowCount).padStart(6),
        );
      };

      /*
       * Suspend the append-only guards up front, for the whole transaction.
       *
       * `ALTER TABLE ... DISABLE TRIGGER` is itself transactional in
       * PostgreSQL, so a rollback restores them along with the rows. That is
       * the safety net, and it is why there is no `finally` here: a failure
       * anywhere below cannot leave a *committed* database with its ledger
       * guards down, because nothing below gets committed either.
       *
       * The first version of this script suspended only the journal guard and
       * died on `DELETE on ledger_entries is not permitted` — the ledger has
       * two doors, and both are locked.
       */
      for (const [table, trigger] of GUARDS) {
        await client.query(`ALTER TABLE ${table} DISABLE TRIGGER ${trigger}`);
      }

      console.log(
        '  (guards suspended: ' + GUARDS.map(([t]) => t).join(', ') + ')',
      );

      console.log('\n=== DELETING ===');

      // Children of transactions first.
      await run(
        'provider_events',
        `delete from provider_events where transaction_id in (
           select t.id from transactions t
           join invoices i on i.id = t.invoice_id
           where i.fiscal_year = any($1))`,
        [FAKE_INVOICE_YEARS],
      );

      await run(
        'reconciliation_items',
        `delete from reconciliation_items where transaction_id in (
           select t.id from transactions t
           join invoices i on i.id = t.invoice_id
           where i.fiscal_year = any($1))`,
        [FAKE_INVOICE_YEARS],
      );

      await run(
        'refunds',
        `delete from refunds where transaction_id in (
           select t.id from transactions t
           join invoices i on i.id = t.invoice_id
           where i.fiscal_year = any($1))`,
        [FAKE_INVOICE_YEARS],
      );

      await run(
        'transactions',
        `delete from transactions where invoice_id in (
           select id from invoices where fiscal_year = any($1))`,
        [FAKE_INVOICE_YEARS],
      );

      await run(
        'payment_sessions',
        `delete from payment_sessions where invoice_id in (
           select id from invoices where fiscal_year = any($1))`,
        [FAKE_INVOICE_YEARS],
      );

      // invoice_lines is ON DELETE CASCADE, so this takes them with it.
      await run(
        'invoices',
        `delete from invoices where fiscal_year = any($1)`,
        [FAKE_INVOICE_YEARS],
      );

      // The ledger. Lines go before the journals they hang off.
      await run(
        'ledger_entries',
        `delete from ledger_entries where journal_id in (
           select j.id from journal_entries j
           join fiscal_periods p on p.id = j.fiscal_period_id
           where p.fiscal_year = any($1))`,
        [FAKE_YEARS],
      );

      await run(
        'journal_entries',
        `delete from journal_entries where fiscal_period_id in (
           select id from fiscal_periods where fiscal_year = any($1))`,
        [FAKE_YEARS],
      );

      await run(
        'fiscal_periods',
        `delete from fiscal_periods where fiscal_year = any($1)`,
        [FAKE_YEARS],
      );

      /*
       * Back on before anything is committed, and checked again below. A
       * database that commits with its ledger guards down would be a worse
       * outcome than any amount of leftover fixture data.
       */
      for (const [table, trigger] of GUARDS) {
        await client.query(`ALTER TABLE ${table} ENABLE TRIGGER ${trigger}`);
      }

      console.log('  (guards restored)');

      const after = await counts(client);
      printCounts('AFTER (inside the transaction)', after);

      console.log('\n=== VERIFY ===');

      const checks = await client.query<{
        unbalanced: string;
        orphan_ledger: string;
        orphan_txn: string;
        guards_on: string;
      }>(
        `select
           (select count(*) from v_unbalanced_journals)::text as unbalanced,
           (select count(*) from ledger_entries le
              left join journal_entries j on j.id = le.journal_id
             where j.id is null)::text as orphan_ledger,
           (select count(*) from transactions t
              left join invoices i on i.id = t.invoice_id
             where i.id is null)::text as orphan_txn,
           (select count(*) from pg_trigger
             where tgname = any($1) and tgenabled = 'O')::text as guards_on`,
        [GUARDS.map(([, trigger]) => trigger)],
      );

      const c = checks.rows[0]!;
      const guardOn = Number(c.guards_on) === GUARDS.length;

      console.log(
        '  unbalanced journals (must be 0)   ' + c.unbalanced.padStart(6),
      );
      console.log(
        '  orphaned ledger rows (must be 0)  ' + c.orphan_ledger.padStart(6),
      );
      console.log(
        '  orphaned transactions (must be 0) ' + c.orphan_txn.padStart(6),
      );
      console.log(
        '  invoices left (expect 2)          ' +
          String(after.invoices).padStart(6),
      );
      console.log(
        '  append-only guards back on        ' +
          (c.guards_on + ' of ' + GUARDS.length).padStart(6) +
          (guardOn ? '' : ' <<<'),
      );

      const gaps = await client.query<{
        fiscal_year: string;
        mx: string;
        n: string;
      }>(
        `select fiscal_year, max(sequence_no)::text mx, count(*)::text n
           from invoices group by fiscal_year order by 1`,
      );

      console.log('  numbering after cleanup:');
      for (const row of gaps.rows) {
        const gap = BigInt(row.mx) !== BigInt(row.n);
        console.log(
          '    ' +
            row.fiscal_year.padEnd(10) +
            'highest=' +
            row.mx.padEnd(8) +
            'count=' +
            row.n.padEnd(6) +
            (gap ? '<<< STILL A GAP' : 'gapless'),
        );
      }

      const safe =
        c.unbalanced === '0' &&
        c.orphan_ledger === '0' &&
        c.orphan_txn === '0' &&
        after.invoices === '2' &&
        guardOn &&
        gaps.rows.every((r) => BigInt(r.mx) === BigInt(r.n));

      if (!safe) {
        console.log(
          '\nA verification check failed. Rolling back, changing nothing.',
        );
        await client.query('ROLLBACK');
      } else if (commit) {
        await client.query('COMMIT');
        console.log('\nCOMMITTED.');
      } else {
        await client.query('ROLLBACK');
        console.log(
          '\nDry run — rolled back. Re-run with CONFIRM=yes to apply.',
        );
      }

      return true;
    } catch (error) {
      // Best-effort: on a dropped connection this throws too, and the server
      // has already rolled the transaction back anyway.
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    }
  } finally {
    await client.end().catch(() => {});
  }
}

const ATTEMPTS = 3;

for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    await runOnce();
    break;
  } catch (error) {
    if (!isTransient(error) || attempt === ATTEMPTS) throw error;

    const code = (error as { code?: string }).code;
    console.log(
      `\nConnection dropped (${code}) — nothing was changed. ` +
        `Retrying, attempt ${attempt + 1} of ${ATTEMPTS}.\n`,
    );

    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}
