import { z } from 'zod';

import { recordOfflinePayment } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { mutatingEndpoint } from '@/lib/api/route';
import { serializeOfflinePayment } from '@/lib/api/serialize';

/**
 * `POST /v1/offline-payments` — the integrator's staff report cash they took
 * against one of the integrator's invoices.
 *
 * A claim, not a payment: it books nothing and issues no receipt until a
 * Softmato admin confirms it (`packages/payment-core/offline/cash.ts`). Needs
 * the `offline_payment:record` scope, which is off by default.
 */
const schema = z.object({
  invoice_id: z.string().min(1).max(60),
  amount_minor: z
    .number()
    .int('Amounts are integers in paisa')
    .positive()
    .max(Number.MAX_SAFE_INTEGER),
  collected_by: z.string().trim().min(1).max(120),
  collected_at: z.string().datetime().optional(),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

export const POST = mutatingEndpoint(
  'offline_payment:record',
  'POST /v1/offline-payments',
  async ({ application, body, tx }) => {
    const input = schema.parse(body);
    const recorded = await recordOfflinePayment(
      tx,
      application,
      {
        invoiceNo: input.invoice_id,
        amountMinor: BigInt(input.amount_minor),
        collectedBy: input.collected_by,
        ...(input.collected_at
          ? { collectedAt: new Date(input.collected_at) }
          : {}),
        ...(input.reference ? { reference: input.reference } : {}),
        ...(input.note ? { note: input.note } : {}),
      },
      recordAudit,
    );

    return { status: 201, body: serializeOfflinePayment(recorded) };
  },
);
