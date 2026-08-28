# Testing

Coverage percentage is not the goal. The goal is that a specific list of
failures cannot happen.

---

## 1. Stack

| Layer              | Tool                                          |
| ------------------ | --------------------------------------------- |
| Unit + integration | Vitest                                        |
| Database           | Vitest against a real Postgres — never a mock |
| End-to-end         | Playwright                                    |
| Provider sandboxes | `dev.khalti.com`, `rc-checkout.esewa.com.np`  |
| Edge cases         | a mock provider adapter                       |

**Never mock the database for financial tests.** The constraints _are_ the
logic. A mock would pass tests that the real database rejects, which is exactly
backwards.

Each test file runs in a transaction that rolls back, or against a fresh schema.

---

## 2. Ledger — must pass before any provider goes live

```ts
test('database rejects an unbalanced journal', async () => {
  await expect(
    db.transaction(async (tx) => {
      const j = await insertJournal(tx);
      await insertLine(tx, j, '1032', 'debit', 500000n);
      await insertLine(tx, j, '1110', 'credit', 400000n); // ← doesn't balance
    }),
  ).rejects.toThrow(/unbalanced/);
});

test('a ledger row cannot be updated', async () => {
  const { lineId } = await postBalancedJournal();
  await expect(
    db.update(ledgerEntries).set({ amountMinor: 1n }).where(eq(id, lineId)),
  ).rejects.toThrow(/not permitted/);
});

test('a ledger row cannot be deleted', async () => {
  /* … */
});
test('a journal with no lines is rejected', async () => {
  /* … */
});
test('a closed period rejects new postings', async () => {
  /* … */
});
test('a non-postable header account rejects a line', async () => {
  /* … */
});
```

**After every test suite, assert `v_unbalanced_journals` returns zero rows.**
Put it in global teardown.

---

## 3. Idempotency

The single most important behaviour in the system.

```ts
test('five identical callbacks produce one journal entry', async () => {
  const payload = signedEsewaCallback({ status: 'SUCCESS', amount: 500000 });
  for (let i = 0; i < 5; i++) await postCallback(payload);

  const journals = await journalsFor(txnId);
  expect(journals).toHaveLength(1);
});

test('the same Idempotency-Key returns the same session', async () => {
  const a = await createCheckout({ key: 'k1', invoiceId });
  const b = await createCheckout({ key: 'k1', invoiceId });
  expect(b.session_id).toBe(a.session_id);
});

test('the same key with a different body is a 409', async () => {
  /* … */
});

test('concurrent processing of one transaction produces one result', async () => {
  await Promise.all([
    processResult(txnId, verified),
    processResult(txnId, verified),
    processResult(txnId, verified),
  ]);
  expect(await journalsFor(txnId)).toHaveLength(1);
});

test('a callback and a poll racing produce one journal entry', async () => {
  /* … */
});
```

---

## 4. Forgery and trust

```ts
test('a forged return URL marks nothing paid', async () => {
  await get(`/checkout/${sessionId}/return?status=Completed&pidx=fake`);

  const inv = await getInvoice(invoiceId);
  expect(inv.status).not.toBe('paid');
  expect(await journalsFor(txnId)).toHaveLength(0);
});

test('an invalid signature is rejected before processing', async () => {
  const res = await postCallback({ ...validPayload, signature: 'wrong' });
  expect(res.status).toBe(400);
  expect(await providerEventsFor(txnId)).toHaveLength(0);
});

test('a client-supplied amount is ignored', async () => {
  const s = await createCheckout({ invoiceId, amount: 1 }); // invoice is 500000
  expect(s.amount).toBe(500000);
});

test('an expired session cannot be paid', async () => {
  /* … */
});
test('a replayed webhook is deduplicated by provider_event_id', async () => {
  /* … */
});
```

---

## 5. Amount integrity

```ts
test('a provider amount mismatch sets reconciliation_required and posts nothing', async () => {
  await processResult(txnId, { ...verified, grossAmountMinor: 450000n }); // expected 500000

  const txn = await getTransaction(txnId);
  expect(txn.status).toBe('reconciliation_required');
  expect(txn.journalId).toBeNull();
  expect(await getInvoice(invoiceId)).toHaveProperty('status', 'issued');
});

test('the provider fee is taken from the response, not computed', async () => {
  const txn = await processKhaltiLookup({ total_amount: 500000, fee: 1300 });
  expect(txn.providerFeeMinor).toBe(1300n); // not 2% of gross
});

test('a mismatch is never auto-resolved', async () => {
  /* … */
});
```

---

## 6. Authorization

```ts
test('application A cannot read application B transactions', async () => {
  const res = await getTransaction(bTxnId, { as: appA });
  expect(res.status).toBe(404); // 404, not 403 — do not confirm existence
});

test('a SaaS cannot approve a refund', async () => {
  /* insufficient scope */
});
test('a SaaS cannot create an invoice for another product', async () => {
  /* … */
});
test('a portal client sees only their own projects', async () => {
  /* … */
});
test('changing a URL id returns 404, not another tenant data', async () => {
  /* … */
});
test('an admin without TOTP cannot be created', async () => {
  /* constraint */
});
```

---

## 7. Money formatting

Cheap tests, high value — this is easy to get wrong and visible to customers.

```ts
test.each([
  [500000n, 'NPR 5,000.00'],
  [123456700n, 'NPR 12,34,567.00'], // lakh grouping, not 1,234,567
  [10000000n, 'NPR 1,00,000.00'],
  [-300000n, '−NPR 3,000.00'], // U+2212, not hyphen
  [1n, 'NPR 0.01'],
  [0n, 'NPR 0.00'],
])('formatNPR(%s) = %s', (minor, expected) => {
  expect(formatNPR(minor)).toBe(expected);
});

test.each([
  ['5000', 500000n],
  ['5,000.50', 500050n],
  ['0.01', 1n],
])('parseNPRToMinor(%s) = %s', (input, expected) => {
  expect(parseNPRToMinor(input)).toBe(expected);
});

test('parseNPRToMinor rejects three decimal places', () => {
  expect(() => parseNPRToMinor('5000.555')).toThrow();
});
```

---

## 8. Accounting

```ts
test('an annual subscription invoice defers revenue, not recognises it', async () => {
  await issueInvoice({ totalMinor: 1200000n, months: 12 });
  expect(await balanceOf('2110')).toBe(1200000n); // deferred revenue
  expect(await balanceOf('4010')).toBe(0n); // revenue untouched
});

test('monthly recognition releases exactly one twelfth', async () => {
  await runRevenueRecognition(period1);
  expect(await balanceOf('4010')).toBe(100000n);
  expect(await balanceOf('2110')).toBe(1100000n);
});

test('TDS on an agency payment lands in 1210', async () => {
  /* §9.7 */
});
test('P&L and balance sheet tie to the trial balance', async () => {
  /* to the paisa */
});
test('product P&L across all products sums to company P&L', async () => {
  /* … */
});
test('a reversing entry corrects a mistake, both visible', async () => {
  /* … */
});
test('invoice numbers are gapless within a fiscal year', async () => {
  /* … */
});
```

---

## 9. End to end (Playwright)

```
Fonepay      create session → checkout → sandbox pay → confirm
             → invoice paid → receipt emailed → webhook delivered
             → ledger balances

Khalti       create session → checkout → sandbox pay → return
             → lookup confirms → invoice paid → receipt emailed
             → ledger balances

eSewa mobile UA → Intent deeplink | desktop UA → ePay form

Refund       request → approve → provider refund → reversing entries

Public       every page renders, CMS edit reflects, contact form works

Admin        login requires TOTP; a session without TOTP cannot reach /admin
```

Run the checkout flow at 360px and on throttled 3G — a large share of customers
pay on a phone on a slow connection.

---

## 10. Before accepting any phase

- [ ] Full suite passes locally
- [ ] **Full suite passes against a Neon branch** — the HTTP driver handles
      transactions differently, and a test that passes locally and fails on Neon
      is exactly the failure mode to catch before launch
- [ ] `v_unbalanced_journals` returns zero rows
- [ ] No secret appears in a client bundle (grep the build output)
- [ ] Lighthouse ≥ 95 on any new public page
- [ ] Keyboard navigable, visible focus, reduced motion respected
- [ ] `MEMORY.md` and `CHANGELOG.md` updated

---

## 11. What not to test

- Framework behaviour — Next.js routing is not ours to verify
- Library internals
- Generated Drizzle types
- Exact visual output — that's review, not assertion
- Trivial getters

Time goes into the money paths. Everything else is secondary.
