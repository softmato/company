/**
 * What gets frozen onto an invoice at issue, and what a caller cannot forge.
 *
 * Billing spec §2.1: an already-issued invoice must not change when the
 * customer's details later do. The read path was built for this from the
 * start; these are the two things about the *write* that could be quietly
 * wrong, and neither would ever fail loudly.
 *
 * The first is the source. Snapshotting the incoming request rather than the
 * customer row would drop the address — the API has no field for one, so it
 * only ever comes from the admin panel — and would drop a PAN already on file
 * from any request that omitted it. Both would vanish off the document with
 * nothing to notice.
 *
 * The second is precedence. `metadata` is free-form and handed through from
 * the API, which is how `presentation` arrives. If a caller-supplied
 * `snapshots` key could survive, a request could name one customer on the
 * printed document and bill a different one.
 */
import { describe, expect, test } from 'vitest';

import {
  buildSnapshots,
  invoiceMetadata,
  partySnapshot,
  type PartySnapshot,
} from '../invoices/snapshot';

const SELLER: PartySnapshot = {
  name: 'Softmato Private Limited',
  address: 'Kathmandu',
  pan: '623692242',
  email: 'billing@softmato.com',
  phone: '9709155982',
};

/** As the row stands after `upsertCustomer` — not as the request described it. */
const CUSTOMER_ROW = {
  id: 41,
  name: 'Ram Bahadur',
  address: 'Baneshwor, Kathmandu',
  pan: '301234567',
  email: 'ram@example.com',
  phone: '9800000000',
};

describe('partySnapshot', () => {
  test('carries the fields the row has, including the two the API cannot set', () => {
    expect(partySnapshot(CUSTOMER_ROW)).toEqual({
      name: 'Ram Bahadur',
      address: 'Baneshwor, Kathmandu',
      pan: '301234567',
      email: 'ram@example.com',
      phone: '9800000000',
    });
  });

  test('records a blank as a blank', () => {
    expect(
      partySnapshot({
        name: 'No details Ltd',
        address: null,
        pan: null,
        email: null,
        phone: null,
      }),
    ).toEqual({
      name: 'No details Ltd',
      address: null,
      pan: null,
      email: null,
      phone: null,
    });
  });

  test('takes nothing but the party fields — an id is not on the document', () => {
    expect(Object.keys(partySnapshot(CUSTOMER_ROW)).sort()).toEqual([
      'address',
      'email',
      'name',
      'pan',
      'phone',
    ]);
  });
});

describe('buildSnapshots', () => {
  test('freezes both parties when there is a seller to freeze', () => {
    expect(buildSnapshots(SELLER, CUSTOMER_ROW)).toEqual({
      seller: SELLER,
      customer: partySnapshot(CUSTOMER_ROW),
    });
  });

  test('omits the seller rather than storing null for it', () => {
    const snapshots = buildSnapshots(null, CUSTOMER_ROW);

    // A missing party is the reader's "fall back to live, and say so".
    // A `null` would be a third state with no rule behind it.
    expect('seller' in snapshots).toBe(false);
    expect(snapshots.customer).toEqual(partySnapshot(CUSTOMER_ROW));
  });
});

describe('invoiceMetadata', () => {
  test('keeps what the caller sent alongside the snapshots', () => {
    const metadata = invoiceMetadata(
      { presentation: { version: 1, plan_name: 'Growth' } },
      buildSnapshots(SELLER, CUSTOMER_ROW),
    );

    expect(metadata['presentation']).toEqual({
      version: 1,
      plan_name: 'Growth',
    });
    expect(metadata['snapshots']).toEqual(buildSnapshots(SELLER, CUSTOMER_ROW));
  });

  test('a caller cannot supply its own snapshots', () => {
    const forged = {
      snapshots: {
        customer: {
          name: 'Somebody Else',
          address: null,
          pan: '000000000',
          email: null,
          phone: null,
        },
      },
    };

    const metadata = invoiceMetadata(
      forged,
      buildSnapshots(SELLER, CUSTOMER_ROW),
    );

    expect(metadata['snapshots']).toEqual(buildSnapshots(SELLER, CUSTOMER_ROW));
  });

  test('works with no caller metadata at all', () => {
    expect(invoiceMetadata(null, buildSnapshots(null, CUSTOMER_ROW))).toEqual({
      snapshots: { customer: partySnapshot(CUSTOMER_ROW) },
    });
    expect(
      invoiceMetadata(undefined, buildSnapshots(null, CUSTOMER_ROW)),
    ).toEqual({
      snapshots: { customer: partySnapshot(CUSTOMER_ROW) },
    });
  });
});
