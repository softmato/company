/**
 * `POST /v1/checkout` (docs/API.md §3).
 *
 * **Note there is no `amount` field.** The server reads it from the invoice.
 * A client-supplied amount would be a vulnerability, so the schema below has
 * nowhere to put one and `createSession` has no parameter for one.
 */
import { z } from 'zod';

import { createSession } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { env } from '@/lib/env';
import { mutatingEndpoint } from '@/lib/api/route';
import { serializeSession } from '@/lib/api/serialize';

const schema = z.object({
  /** The `invoice_id` returned by `POST /v1/invoices` — its `invoice_no`. */
  invoice_id: z.string().min(1).max(60),
  return_url: z
    .string()
    .url()
    .startsWith('https://', 'Return URLs must be https')
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const POST = mutatingEndpoint(
  'payment:create',
  'POST /v1/checkout',
  async ({ application, body, tx }) => {
    const input = schema.parse(body);

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
