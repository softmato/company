import type { PartySnapshot } from '@softmato/payment-core';

import type { Party } from './types';

/**
 * Reading the party details an invoice was *issued* with, when they exist.
 *
 * The billing spec §2.1 is emphatic about this, and it is right: *"if the
 * customer later changes their address, an already-issued invoice must not
 * change."* An invoice is an archival document. Re-rendering a six-month-old
 * one against today's `customers` row produces a PDF that does not match the
 * PDF the customer was sent, and the difference is invisible — both look
 * correct, and only one of them is the document of record.
 *
 * `createInvoice` writes these into the existing `metadata` jsonb — no
 * migration, and in the same statement that allocates the number and sets
 * `issued_at`, so there is no window in which an issued invoice lacks them.
 *
 * **Invoices issued before that existed have none, and always will.** They
 * fall back to live data here and say so: `renderedFromLiveParties` ends up on
 * the document and every surface reports it, because the one thing worse than
 * a document without a snapshot is a document without a snapshot that looks
 * exactly like one with.
 */

/**
 * The shape stored under `invoices.metadata.snapshots`, when it is stored.
 *
 * Typed against `PartySnapshot` from the package that writes it, so a change
 * to the stored shape fails to compile here rather than silently reading as
 * absent. `Partial` because what is in the column is whatever was written —
 * a row from a future version, or a half-written one, is data to be read
 * defensively rather than a value to be trusted for its type.
 */
interface StoredSnapshots {
  seller?: Partial<PartySnapshot>;
  customer?: Partial<PartySnapshot>;
}

export interface ResolvedParties {
  seller: Party;
  customer: Party;
  /** True when either party fell back to live data. */
  fromLive: boolean;
}

/**
 * Prefers the frozen snapshot, falls back to live, and says which happened.
 *
 * A *partial* snapshot counts as live for reporting purposes: if the stored
 * copy is missing the PAN and the live row supplies it, the document is a
 * blend and must not claim to be frozen.
 */
export function resolveParties(
  metadata: Record<string, unknown>,
  liveSeller: Party,
  liveCustomer: Party,
): ResolvedParties {
  const stored = readSnapshots(metadata);

  const seller = merge(stored?.seller, liveSeller);
  const customer = merge(stored?.customer, liveCustomer);

  return {
    seller: seller.party,
    customer: customer.party,
    fromLive: seller.usedLive || customer.usedLive,
  };
}

function readSnapshots(
  metadata: Record<string, unknown>,
): StoredSnapshots | null {
  const raw = metadata['snapshots'];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  return raw as StoredSnapshots;
}

/**
 * One party, preferring what was frozen.
 *
 * The parameter is the *stored* shape and the return is the *document* shape;
 * the two are the same five fields today, and this is the seam where the
 * compiler notices if they stop being.
 */
function merge(
  stored: Partial<PartySnapshot> | undefined,
  live: Party,
): { party: Party; usedLive: boolean } {
  if (!stored) return { party: live, usedLive: true };

  let usedLive = false;

  const pick = <K extends keyof Party>(key: K): Party[K] => {
    const value = stored[key];

    if (value === undefined) {
      usedLive = true;
      return live[key];
    }

    return value as Party[K];
  };

  return {
    party: {
      name: pick('name'),
      address: pick('address'),
      pan: pick('pan'),
      email: pick('email'),
      phone: pick('phone'),
    },
    usedLive,
  };
}
