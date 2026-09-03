/**
 * `POST /v1/refunds` (docs/API.md §3) — scope `refund:request`.
 *
 * **This files a request. It does not refund anything.** A row is written at
 * status `requested` and that is the end of it: no provider is contacted, no
 * journal posts, no money moves. A Softmato admin approves it afterwards, and
 * the admin panel is read-only today.
 *
 * The response carries a `note` saying exactly that, and it is there because
 * the failure mode is a person, not a program: an integrator who reads
 * `"status": "requested"` as "refund created" and tells their customer the
 * money is on its way has been misled by us.
 *
 * Thin, like its siblings: parse, call into `payment-core`, serialize. The
 * ownership check, the state check and the amount check all live in
 * `requestRefund`, so the CLI and any future admin path get the same refusals.
 */
import { z } from 'zod';

import { requestRefund } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { mutatingEndpoint } from '@/lib/api/route';
import { serializeRefund } from '@/lib/api/serialize';

const schema = z.object({
  /** The `txn_no`, as the webhook and `GET /v1/transactions` both spell it. */
  transaction_id: z.string().min(1).max(60),
  /** Paisa, integer. Omit to request the whole refundable balance. */
  amount_minor: z
    .number()
    .int('Amounts are integers in paisa')
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .optional(),
  /**
   * Required, and required for a reason: this row is read by whoever decides
   * whether to approve it, possibly months later, and "refund" is not an
   * answer to "why".
   */
  reason: z.string().min(1).max(500),
});

export const POST = mutatingEndpoint(
  'refund:request',
  'POST /v1/refunds',
  async ({ application, body, tx }) => {
    const input = schema.parse(body);

    const filed = await requestRefund(
      tx,
      application,
      {
        transactionId: input.transaction_id,
        ...(input.amount_minor !== undefined
          ? { amountMinor: BigInt(input.amount_minor) }
          : {}),
        reason: input.reason,
      },
      recordAudit,
    );

    return { status: 201, body: serializeRefund(filed) };
  },
);
