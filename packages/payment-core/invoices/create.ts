/**
 * `POST /v1/invoices` (docs/API.md §3), the part that is not HTTP.
 *
 * Scope note: `PHASES.md` files invoicing under Phase 6. This is the minimum
 * Phase 3 cannot do without — `POST /v1/checkout` takes an `invoice_id` and
 * reads the amount from it, and acceptance 3 requires the invoice to be marked
 * paid. PDF generation, subscriptions, dunning and monthly revenue recognition
 * stay in Phase 6; the deferred-revenue balance this posts simply sits in 2110
 * until that job exists, which is what it is supposed to do.
 *
 * The invoice is issued, not drafted: a SaaS calling this endpoint intends to
 * bill, and an unissued invoice cannot be paid.
 */
import { and, eq } from 'drizzle-orm';

import {
  customers,
  invoiceLines,
  invoices,
  products,
  type DbTx,
  type Invoice,
} from '@softmato/db';
import {
  DEFAULT_RECEIVABLE_BY_KIND,
  allocateDocumentNo,
  invoiceIssuedJournal,
  isInvoiceableKind,
  postJournal,
  resolveFiscalPeriod,
} from '@softmato/accounting';

import type { AuditRecorder } from '../audit';
import type { AuthenticatedApplication } from '../applications/authenticate';
import { PaymentError } from '../errors';
import { assertRevenueAccounts, defaultRevenueAccount } from './accounts';

export interface CustomerInput {
  externalRef?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  pan?: string | null;
}

export interface InvoiceLineInput {
  description: string;
  /**
   * Whole units only. `amount_minor` has to be an exact number of paisa, and
   * 1.5 × 33,333 paisa is not — a fractional quantity would need a rounding
   * rule, and inventing one on a money path is not on offer (RULES.md §1).
   */
  quantity?: number;
  unitPriceMinor: bigint;
  /** Defaults from the product kind. Validated against the chart of accounts. */
  revenueAccount?: string;
}

export interface CreateInvoiceInput {
  /** The SaaS's own invoice id. Unique per application; a repeat is a lookup. */
  externalRef?: string | null;
  customer: CustomerInput;
  lines: InvoiceLineInput[];
  serviceStartsAt?: Date | null;
  serviceEndsAt?: Date | null;
  dueAt?: Date | null;
}

export interface CreatedInvoice {
  invoice: Invoice;
  /** False when `external_ref` matched an invoice we had already issued. */
  created: boolean;
}

/**
 * Takes the transaction rather than opening one: the idempotency record and
 * the invoice have to commit together, or a crash between them leaves a key
 * marked done for an invoice that does not exist (docs/API.md §1).
 */
export async function createInvoice(
  tx: DbTx,
  application: AuthenticatedApplication,
  input: CreateInvoiceInput,
  audit: AuditRecorder,
): Promise<CreatedInvoice> {
  assertLines(input.lines);
  assertServiceWindow(input);

  // "A repeat returns the existing invoice" (docs/API.md §3). If two different
  // idempotency keys race the same `external_ref`, one loses on the unique
  // index and the whole request rolls back — including its idempotency row, so
  // the client's retry runs this check again and finds the winner's invoice.
  if (input.externalRef) {
    const existing = await findByExternalRef(
      tx,
      application.id,
      input.externalRef,
    );
    if (existing) return { invoice: existing, created: false };
  }

  const issuedAt = new Date();

  {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, application.productId))
      .limit(1);

    if (!product || !product.isActive) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'The application is attached to a product that cannot be invoiced',
        { productId: application.productId },
      );
    }

    if (!isInvoiceableKind(product.kind)) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        `Product kind ${product.kind} is not something a customer is invoiced for`,
        { productId: product.id, kind: product.kind },
      );
    }

    const fallbackRevenue = defaultRevenueAccount(product.kind);
    const lines = input.lines.map((line, index) => {
      const quantity = line.quantity ?? 1;
      return {
        lineNo: index + 1,
        description: line.description,
        quantity,
        unitPriceMinor: line.unitPriceMinor,
        amountMinor: line.unitPriceMinor * BigInt(quantity),
        revenueAccount: line.revenueAccount ?? fallbackRevenue,
      };
    });

    await assertRevenueAccounts(
      tx,
      lines.map((line) => line.revenueAccount),
    );

    const customerId = await upsertCustomer(tx, product.id, input.customer);

    const total = lines.reduce((sum, line) => sum + line.amountMinor, 0n);

    // The journal decides the fiscal year, and the invoice number has to agree
    // with it — an invoice numbered into one year and posted into another is
    // two records of the same event that disagree.
    const journalInput = invoiceIssuedJournal({
      invoiceId: 0, // replaced below, once the row exists
      invoiceNo: 'pending',
      productId: product.id,
      customerId,
      receivableAccount: DEFAULT_RECEIVABLE_BY_KIND[product.kind],
      lines,
      occurredAt: issuedAt,
      serviceStartsAt: input.serviceStartsAt ?? null,
      serviceEndsAt: input.serviceEndsAt ?? null,
    });

    const { fiscalYear } = await resolveFiscalPeriod(tx, issuedAt);
    const { sequence, documentNo } = await allocateDocumentNo(
      tx,
      'INV',
      fiscalYear,
    );

    const [invoice] = await tx
      .insert(invoices)
      .values({
        invoiceNo: documentNo,
        fiscalYear,
        sequenceNo: sequence,
        productId: product.id,
        applicationId: application.id,
        customerId,
        externalRef: input.externalRef ?? null,
        status: 'issued',
        subtotalMinor: total,
        totalMinor: total,
        currency: 'NPR',
        serviceStartsAt: input.serviceStartsAt ?? null,
        serviceEndsAt: input.serviceEndsAt ?? null,
        issuedAt,
        dueAt: input.dueAt ?? null,
      })
      .returning();

    if (!invoice) {
      throw new PaymentError('INTERNAL', 'Invoice insert returned no row', {
        documentNo,
      });
    }

    await tx.insert(invoiceLines).values(
      lines.map((line) => ({
        invoiceId: invoice.id,
        lineNo: line.lineNo,
        description: line.description,
        quantity: String(line.quantity),
        unitPriceMinor: line.unitPriceMinor,
        amountMinor: line.amountMinor,
        revenueAccount: line.revenueAccount,
      })),
    );

    const posted = await postJournal(tx, {
      ...journalInput,
      sourceId: String(invoice.id),
      description: `Invoice ${invoice.invoiceNo} issued`,
    });

    await audit(
      {
        actorType: 'application',
        actorId: application.clientId,
        action: 'invoice.issue',
        resourceType: 'invoice',
        resourceId: String(invoice.id),
        afterState: {
          invoiceNo: invoice.invoiceNo,
          totalMinor: total.toString(),
          journalNo: posted.journalNo,
          deferred: input.serviceStartsAt != null && input.serviceEndsAt != null,
        },
      },
      tx,
    );

    return { invoice, created: true };
  }
}

/**
 * A customer is identified by the SaaS's own reference, not by name or email —
 * two hostels can share an owner's email, and a renamed customer is still the
 * same customer.
 */
async function upsertCustomer(
  tx: DbTx,
  productId: string,
  input: CustomerInput,
): Promise<number> {
  if (input.externalRef) {
    const [existing] = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.productId, productId),
          eq(customers.externalRef, input.externalRef),
        ),
      )
      .limit(1);

    if (existing) {
      await tx
        .update(customers)
        .set({
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          ...(input.pan !== undefined ? { pan: input.pan } : {}),
        })
        .where(eq(customers.id, existing.id));

      return existing.id;
    }
  }

  const [created] = await tx
    .insert(customers)
    .values({
      productId,
      externalRef: input.externalRef ?? null,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      pan: input.pan ?? null,
    })
    .returning({ id: customers.id });

  if (!created) {
    throw new PaymentError('INTERNAL', 'Customer insert returned no row', {
      productId,
    });
  }

  return created.id;
}

async function findByExternalRef(
  tx: DbTx,
  applicationId: number,
  externalRef: string,
): Promise<Invoice | undefined> {
  const [row] = await tx
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.applicationId, applicationId),
        eq(invoices.externalRef, externalRef),
      ),
    )
    .limit(1);

  return row;
}

function assertLines(lines: InvoiceLineInput[]): void {
  if (lines.length === 0) {
    throw new PaymentError('VALIDATION_FAILED', 'An invoice needs a line', {});
  }

  for (const [index, line] of lines.entries()) {
    if (line.unitPriceMinor <= 0n) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Every line needs a positive unit price in paisa',
        { line: index + 1 },
      );
    }

    const quantity = line.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Quantity must be a whole number; a fractional one has no exact paisa amount',
        { line: index + 1, quantity },
      );
    }
  }
}

function assertServiceWindow(input: CreateInvoiceInput): void {
  const { serviceStartsAt: from, serviceEndsAt: to } = input;

  // One without the other is ambiguous: is this deferred or not? The answer
  // decides whether revenue is recognised now or over a year, so it is not a
  // field to be lenient about.
  if ((from == null) !== (to == null)) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'Give both service_starts_at and service_ends_at, or neither',
      {},
    );
  }

  if (from && to && to <= from) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'service_ends_at must be after service_starts_at',
      {},
    );
  }
}
