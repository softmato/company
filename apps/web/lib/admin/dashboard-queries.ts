import 'server-only';
import { sql } from 'drizzle-orm';
import { auditLogs, db } from '@softmato/db';
import { desc } from 'drizzle-orm';

import type {
  DashboardInvoice,
  DashboardMethod,
  DashboardMonth,
  DashboardPayment,
  DashboardSnapshot,
} from './dashboard-model';

export type {
  DashboardInvoice,
  DashboardMethod,
  DashboardMonth,
  DashboardPayment,
  DashboardSnapshot,
} from './dashboard-model';

/**
 * What the dashboard can honestly show today.
 *
 * The read model is deliberately explicit. Each metric maps to a database
 * fact, and the dashboard never fills an unavailable feature with a made-up
 * zero.
 */

/**
 * The one number that must always be zero. If `v_unbalanced_journals` ever
 * returns a row the books are wrong and nothing else on the page matters
 * (docs/TESTING.md §2).
 */
export async function unbalancedJournalCount(): Promise<number> {
  const result = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM v_unbalanced_journals`,
  );

  return Number(result.rows[0]?.count ?? '0');
}

export interface ActivityEntry {
  id: number;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorId: string | null;
  occurredAt: Date;
}

/** The most recent admin mutations, newest first. */
export async function recentActivity(limit = 8): Promise<ActivityEntry[]> {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      actorId: auditLogs.actorId,
      occurredAt: auditLogs.occurredAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.occurredAt))
    .limit(limit);
}

/**
 * All dashboard reads in one place. The page and its refresh API consume the
 * same read model so a refresh cannot quietly disagree with the first render.
 */
export async function dashboardSnapshot(): Promise<DashboardSnapshot> {
  const [
    unbalancedCount,
    metrics,
    revenueByMonth,
    paymentMethods,
    payments,
    attentionPayments,
    overdueInvoiceRows,
    activity,
  ] = await Promise.all([
    unbalancedJournalCount(),
    dashboardMetrics(),
    dashboardRevenue(),
    dashboardPaymentMethods(),
    dashboardPayments(),
    dashboardAttentionPayments(),
    dashboardOverdueInvoices(),
    recentActivity(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    ledger: { unbalancedCount },
    metrics,
    revenueByMonth,
    paymentMethods,
    recentPayments: payments,
    attentionPayments,
    overdueInvoiceRows,
    activity: activity.map((entry) => ({
      ...entry,
      occurredAt: entry.occurredAt.toISOString(),
    })),
  };
}

async function dashboardMetrics(): Promise<DashboardSnapshot['metrics']> {
  const [paymentRows, invoiceRows] = await Promise.all([
    db.execute<{
      collected_minor: string;
      pending_payments: string;
      reconciliation_required: string;
    }>(sql`
      SELECT
        COALESCE(
          SUM(t.gross_amount_minor) FILTER (
            WHERE t.status IN ('succeeded', 'partially_refunded', 'refunded')
              AND t.succeeded_at >= date_trunc('month', CURRENT_TIMESTAMP)
          ), 0
        )::text AS collected_minor,
        COUNT(*) FILTER (WHERE t.status IN ('created', 'pending'))::text
          AS pending_payments,
        COUNT(*) FILTER (WHERE t.status = 'reconciliation_required')::text
          AS reconciliation_required
      FROM transactions t
    `),
    db.execute<{ overdue_invoices: string }>(sql`
      SELECT COUNT(*)::text AS overdue_invoices
      FROM invoices i
      WHERE i.due_at < CURRENT_TIMESTAMP
        AND i.status NOT IN ('paid', 'void', 'written_off')
    `),
  ]);

  const payments = paymentRows.rows[0];
  const invoices = invoiceRows.rows[0];

  return {
    collectedMinor: payments?.collected_minor ?? '0',
    pendingPayments: Number(payments?.pending_payments ?? '0'),
    overdueInvoices: Number(invoices?.overdue_invoices ?? '0'),
    reconciliationRequired: Number(payments?.reconciliation_required ?? '0'),
  };
}

async function dashboardRevenue(): Promise<DashboardMonth[]> {
  const result = await db.execute<{
    month_key: string;
    month_label: string;
    total_minor: string;
  }>(sql`
    SELECT
      to_char(month_start, 'YYYY-MM') AS month_key,
      to_char(month_start, 'Mon') AS month_label,
      COALESCE(SUM(t.gross_amount_minor), 0)::text AS total_minor
    FROM generate_series(
      date_trunc('month', CURRENT_TIMESTAMP) - interval '5 months',
      date_trunc('month', CURRENT_TIMESTAMP),
      interval '1 month'
    ) AS months(month_start)
    LEFT JOIN transactions t
      ON t.succeeded_at >= months.month_start
      AND t.succeeded_at < months.month_start + interval '1 month'
      AND t.status IN ('succeeded', 'partially_refunded', 'refunded')
    GROUP BY month_start
    ORDER BY month_start
  `);

  return result.rows.map((row) => ({
    key: row.month_key,
    label: row.month_label,
    totalMinor: row.total_minor,
  }));
}

async function dashboardPaymentMethods(): Promise<DashboardMethod[]> {
  const result = await db.execute<{
    provider: string;
    provider_name: string;
    payment_count: string;
    total_minor: string;
  }>(sql`
    SELECT
      t.provider_id AS provider,
      p.display_name AS provider_name,
      COUNT(*)::text AS payment_count,
      COALESCE(SUM(t.gross_amount_minor), 0)::text AS total_minor
    FROM transactions t
    INNER JOIN payment_providers p ON p.id = t.provider_id
    WHERE t.succeeded_at >= date_trunc('month', CURRENT_TIMESTAMP)
      AND t.status IN ('succeeded', 'partially_refunded', 'refunded')
    GROUP BY t.provider_id, p.display_name
    ORDER BY SUM(t.gross_amount_minor) DESC, provider
  `);

  return result.rows.map((row) => ({
    provider: row.provider,
    providerName: row.provider_name,
    count: Number(row.payment_count),
    totalMinor: row.total_minor,
  }));
}

async function dashboardPayments(): Promise<DashboardPayment[]> {
  const result = await db.execute<{
    id: number;
    txn_no: string;
    customer_name: string;
    provider: string;
    provider_name: string;
    status: string;
    gross_amount_minor: string;
    created_at: Date | string;
  }>(sql`
    SELECT
      t.id,
      t.txn_no,
      c.name AS customer_name,
      t.provider_id AS provider,
      p.display_name AS provider_name,
      t.status,
      t.gross_amount_minor::text AS gross_amount_minor,
      t.created_at
    FROM transactions t
    INNER JOIN customers c ON c.id = t.customer_id
    INNER JOIN payment_providers p ON p.id = t.provider_id
    ORDER BY t.created_at DESC
    LIMIT 8
  `);

  return result.rows.map((row) => ({
    id: row.id,
    txnNo: row.txn_no,
    customerName: row.customer_name,
    provider: row.provider,
    providerName: row.provider_name,
    status: row.status,
    grossAmountMinor: row.gross_amount_minor,
    createdAt: toIsoTimestamp(row.created_at),
  }));
}

/**
 * Reconciliation flags are always included, even when they are older than the
 * normal recent-payments window. An operational alert must lead to the actual
 * record that needs a person, not an empty filtered table.
 */
async function dashboardAttentionPayments(): Promise<DashboardPayment[]> {
  const result = await db.execute<{
    id: number;
    txn_no: string;
    customer_name: string;
    provider: string;
    provider_name: string;
    status: string;
    gross_amount_minor: string;
    created_at: Date | string;
  }>(sql`
    SELECT
      t.id,
      t.txn_no,
      c.name AS customer_name,
      t.provider_id AS provider,
      p.display_name AS provider_name,
      t.status,
      t.gross_amount_minor::text AS gross_amount_minor,
      t.created_at
    FROM transactions t
    INNER JOIN customers c ON c.id = t.customer_id
    INNER JOIN payment_providers p ON p.id = t.provider_id
    WHERE t.status = 'reconciliation_required'
    ORDER BY t.created_at DESC
    LIMIT 20
  `);

  return result.rows.map((row) => ({
    id: row.id,
    txnNo: row.txn_no,
    customerName: row.customer_name,
    provider: row.provider,
    providerName: row.provider_name,
    status: row.status,
    grossAmountMinor: row.gross_amount_minor,
    createdAt: toIsoTimestamp(row.created_at),
  }));
}

async function dashboardOverdueInvoices(): Promise<DashboardInvoice[]> {
  const result = await db.execute<{
    id: number;
    invoice_no: string;
    customer_name: string;
    status: string;
    remaining_minor: string;
    due_at: Date | string;
  }>(sql`
    SELECT
      i.id,
      i.invoice_no,
      c.name AS customer_name,
      i.status,
      (i.total_minor - i.paid_minor)::text AS remaining_minor,
      i.due_at
    FROM invoices i
    INNER JOIN customers c ON c.id = i.customer_id
    WHERE i.due_at < CURRENT_TIMESTAMP
      AND i.status NOT IN ('paid', 'void', 'written_off')
    ORDER BY i.due_at ASC
    LIMIT 20
  `);

  return result.rows.map((row) => ({
    id: row.id,
    invoiceNo: row.invoice_no,
    customerName: row.customer_name,
    status: row.status,
    remainingMinor: row.remaining_minor,
    dueAt: toIsoTimestamp(row.due_at),
  }));
}

/**
 * Drizzle's typed select mapper returns Date objects, while `db.execute()`
 * exposes the driver's raw timestamp representation. The PostgreSQL and Neon
 * drivers may return either a Date or an ISO-compatible string, so normalize
 * once at the server/API boundary before it reaches client state.
 */
function toIsoTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Dashboard query returned an invalid timestamp');
  }

  return date.toISOString();
}
