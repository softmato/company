/**
 * Reads and flips `payment_providers.is_active`.
 *
 * **Break-glass, and until now there was no glass.** No admin screen writes
 * this column, no other script did, and `seed/index.ts` inserts with ON
 * CONFLICT DO NOTHING — so on any database that had already been seeded, the
 * only way a provider had ever been switched on was somebody typing UPDATE
 * into a console. An environment therefore drifted from the repository the
 * moment anyone did, and "works in dev, dead in production" followed from it.
 *
 *     pnpm providers
 *     pnpm providers -- --activate khalti
 *     pnpm providers -- --deactivate khalti
 *
 * The durable answer is `seed/providers.ts` plus migration 0013, which state
 * the intended value once and give every environment the same one. Reach for
 * this when an environment has to differ from that on purpose, or to see what
 * a database actually holds — which is the question that took a production
 * incident to answer.
 *
 * It says nothing about credentials. A provider is offered only where it is
 * active *and* an adapter is registered for the session's mode, and the second
 * half lives in the environment (`lib/payments/providers.ts`), out of reach
 * from here.
 */
import { closeDb, db, paymentProviders } from '@softmato/db';
import { eq } from 'drizzle-orm';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const activate = flag('--activate');
const deactivate = flag('--deactivate');

if (activate && deactivate) {
  console.error('Pass one of --activate or --deactivate, not both.');
  process.exit(1);
}

const target = activate ?? deactivate;

if (target) {
  const [row] = await db
    .select({ id: paymentProviders.id })
    .from(paymentProviders)
    .where(eq(paymentProviders.id, target))
    .limit(1);

  if (!row) {
    console.error(`No provider with id "${target}".`);
    process.exit(1);
  }

  /*
   * Refused rather than warned about. Fonepay's adapter is a stub pending the
   * bank's integration document, and the composition root will not register
   * it — so an active row cannot produce an offer, only a provider that is
   * filtered out of every checkout page for a reason nobody can see from the
   * database.
   */
  if (activate === 'fonepay') {
    console.error(
      'Fonepay has no adapter yet (PHASES.md Phase 9), and the composition ' +
        'root refuses to register a stub. Activating the row would change ' +
        'nothing a customer can see.',
    );
    process.exit(1);
  }

  await db
    .update(paymentProviders)
    .set({ isActive: Boolean(activate) })
    .where(eq(paymentProviders.id, target));

  console.log(`  ${target} is now ${activate ? 'active' : 'inactive'}`);
}

const rows = await db
  .select({
    id: paymentProviders.id,
    displayName: paymentProviders.displayName,
    isActive: paymentProviders.isActive,
    sortOrder: paymentProviders.sortOrder,
  })
  .from(paymentProviders)
  .orderBy(paymentProviders.sortOrder);

console.log('');
for (const row of rows) {
  const state = row.isActive ? 'active  ' : 'inactive';
  console.log(`  ${state}  ${row.id.padEnd(10)} ${row.displayName}`);
}
console.log('');
console.log('  Active is necessary, not sufficient: an adapter must also be');
console.log(
  '  registered for the session’s mode. See lib/payments/providers.ts.',
);

await closeDb();
