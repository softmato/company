/**
 * `POST /v1/checkout` (docs/API.md §3).
 *
 * **Note there is no `amount` field.** The server reads it from the invoice.
 * A client-supplied amount would be a vulnerability, so the schema below has
 * nowhere to put one and `createSession` has no parameter for one.
 */
import { z } from 'zod';

import { assertRegisteredHost, createSession } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { env } from '@/lib/env';
import { mutatingEndpoint } from '@/lib/api/route';
import { serializeSession } from '@/lib/api/serialize';

const schema = z.object({
  /** The `invoice_id` returned by `POST /v1/invoices` — its `invoice_no`. */
  invoice_id: z.string().min(1).max(60),
  /**
   * Must be https and on a hostname an admin has registered against this
   * application. The scheme check is not repeated here: `assertRegisteredHost`
   * owns it, so there is one answer to "is this an acceptable destination"
   * rather than one here and a different one wherever `webhook_url` is written.
   */
  return_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const POST = mutatingEndpoint(
  'payment:create',
  'POST /v1/checkout',
  async ({ application, body, tx }) => {
    const input = schema.parse(body);

    /*
     * Before `createSession`, so an unregistered host costs the caller a 422
     * and costs us no session row. `tx` is passed so the check reads the same
     * snapshot the insert writes into — a domain deleted mid-request cannot
     * be validated against and then vanish.
     */
    if (input.return_url !== undefined) {
      await assertRegisteredHost(
        application.id,
        input.return_url,
        'return_url',
        tx,
      );
    }

    const { session, checkoutUrl } = await createSession(
      tx,
      application,
      {
        invoiceId: input.invoice_id,
        returnUrl: input.return_url ?? null,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
      env.NEXT_PUBLIC_CHECKOUT_URL,
      recordAudit,
    );

    return { status: 201, body: serializeSession(session, checkoutUrl) };
  },
);
