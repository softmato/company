/**
 * `POST /v1/invoices` (docs/API.md §3).
 *
 * Thin by design: parse, validate, call `createInvoice`, serialize.
 *
 * Deviation from the doc worth knowing: API.md illustrates invoice ids as
 * `inv_01J...`. The schema has no such column — an invoice is identified by
 * its gapless `invoice_no` (`INV-2082/83-000001`), which is what this returns
 * and what `POST /v1/checkout` accepts.
 */
import { z } from 'zod';

import { createInvoice } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { mutatingEndpoint } from '@/lib/api/route';
import { serializeInvoice } from '@/lib/api/serialize';

/** Amounts are integers in paisa. Never a float, never a string with a dot. */
const minorAmount = z
  .number()
  .int('Amounts are integers in paisa')
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

const schema = z.object({
  external_ref: z.string().min(1).max(120).optional(),
  customer: z.object({
    external_ref: z.string().min(1).max(120).optional(),
    name: z.string().min(1).max(200),
    email: z.string().email().optional(),
    phone: z.string().min(1).max(40).optional(),
    pan: z.string().min(1).max(40).optional(),
  }),
  lines: z
    .array(
      z.object({
        description: z.string().min(1).max(300),
        quantity: z.number().int().positive().max(10_000).optional(),
        unit_price_minor: minorAmount,
        revenue_account: z.string().regex(/^[1-6][0-9]{3}$/).optional(),
      }),
    )
    .min(1)
    .max(100),
  service_starts_at: z.string().datetime().optional(),
  service_ends_at: z.string().datetime().optional(),
  due_at: z.string().datetime().optional(),
});

export const POST = mutatingEndpoint(
  'invoice:create',
  'POST /v1/invoices',
  async ({ application, body, tx }) => {
    const input = schema.parse(body);

    const { invoice, created } = await createInvoice(
      tx,
      application,
      {
        externalRef: input.external_ref ?? null,
        customer: {
          externalRef: input.customer.external_ref ?? null,
          name: input.customer.name,
          email: input.customer.email ?? null,
          phone: input.customer.phone ?? null,
          pan: input.customer.pan ?? null,
        },
        lines: input.lines.map((line) => ({
          description: line.description,
          ...(line.quantity !== undefined ? { quantity: line.quantity } : {}),
          unitPriceMinor: BigInt(line.unit_price_minor),
          ...(line.revenue_account !== undefined
            ? { revenueAccount: line.revenue_account }
            : {}),
        })),
        serviceStartsAt: input.service_starts_at
          ? new Date(input.service_starts_at)
          : null,
        serviceEndsAt: input.service_ends_at
          ? new Date(input.service_ends_at)
          : null,
        dueAt: input.due_at ? new Date(input.due_at) : null,
      },
      recordAudit,
    );

    return {
      // 201 only when something was actually created; a repeat of an
      // `external_ref` we already have is a lookup, not a creation.
      status: created ? 201 : 200,
      body: serializeInvoice(invoice),
    };
  },
);
