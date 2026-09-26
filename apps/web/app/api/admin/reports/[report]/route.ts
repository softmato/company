/**
 * `/api/admin/reports/trial-balance?fy=2083/84` — a report as CSV for the
 * accountant. Same loaders as the screen, same Production/Sandbox switch.
 * `journals` exports every ledger line of the year: the general ledger.
 */
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin/api-guard';
import { adminMode } from '@/lib/admin/mode';
import { recordAudit } from '@/lib/audit';
import { toCsv, type Cell } from '@/lib/ledger/csv';
import { generalLedgerLines } from '@/lib/ledger/general-ledger';
import {
  loadBalanceSheet,
  loadProductPl,
  loadProfitAndLoss,
  loadTrialBalance,
  receivablesAging,
} from '@/lib/ledger/reports';
import { resolveFiscalYear } from '@/lib/ledger/scope';
import type { StatementLine } from '@/lib/ledger/statements-math';

export const dynamic = 'force-dynamic';

const section = (
  title: string,
  lines: StatementLine[],
  totalLabel: string,
  total: bigint,
): Cell[][] => [
  [title, '', ''],
  ...lines.map((l): Cell[] => [l.code, l.name, l.amountMinor]),
  ['', totalLabel, total],
];

async function build(
  report: string,
  fy: string,
  mode: 'test' | 'live',
): Promise<{ header: string[]; rows: Cell[][] } | null> {
  switch (report) {
    case 'trial-balance': {
      const tb = await loadTrialBalance(fy, mode);
      return {
        header: ['Code', 'Account', 'Debit', 'Credit', 'Balance'],
        rows: [
          ...tb.lines.map((l): Cell[] => [
            l.code,
            l.name,
            l.debitMinor,
            l.creditMinor,
            l.balanceMinor,
          ]),
          [
            '',
            'Totals',
            tb.debitTotal,
            tb.creditTotal,
            tb.debitTotal - tb.creditTotal,
          ],
        ],
      };
    }
    case 'profit-and-loss': {
      const pl = await loadProfitAndLoss(fy, mode);
      return {
        header: ['Code', 'Account', 'Amount'],
        rows: [
          ...section('Revenue', pl.revenue, 'Total revenue', pl.revenueTotal),
          ...section(
            'Direct costs',
            pl.directCosts,
            'Total direct costs',
            pl.directCostTotal,
          ),
          ['', 'Gross profit', pl.grossProfit],
          ...section(
            'Operating expenses',
            pl.expenses,
            'Total operating expenses',
            pl.expenseTotal,
          ),
          ['', 'Net profit', pl.netProfit],
        ],
      };
    }
    case 'balance-sheet': {
      const bs = await loadBalanceSheet(fy, mode);
      return {
        header: ['Code', 'Account', 'Amount'],
        rows: [
          ...section('Assets', bs.assets, 'Total assets', bs.assetTotal),
          ...section(
            'Liabilities',
            bs.liabilities,
            'Total liabilities',
            bs.liabilityTotal,
          ),
          ...section(
            'Equity',
            bs.equity,
            'Total equity accounts',
            bs.equityTotal,
          ),
          [
            '',
            'Profit not yet closed to retained earnings',
            bs.unclosedEarnings,
          ],
          [
            '',
            'Liabilities and equity',
            bs.liabilityTotal + bs.equityTotal + bs.unclosedEarnings,
          ],
        ],
      };
    }
    case 'by-product': {
      const { columns, company } = await loadProductPl(fy, mode);
      const all = [...columns, { label: 'Company', pl: company }];
      const line = (
        label: string,
        pick: (c: (typeof all)[number]) => bigint,
      ): Cell[] => [label, ...all.map(pick)];
      return {
        header: ['', ...all.map((c) => c.label)],
        rows: [
          line('Revenue', (c) => c.pl.revenueTotal),
          line('Direct costs', (c) => c.pl.directCostTotal),
          line('Gross profit', (c) => c.pl.grossProfit),
          line('Operating expenses', (c) => c.pl.expenseTotal),
          line('Net profit', (c) => c.pl.netProfit),
        ],
      };
    }
    case 'receivables': {
      const { rows } = await receivablesAging(mode);
      return {
        header: ['Invoice', 'Customer', 'Product', 'Due', 'Age', 'Owed'],
        rows: rows.map((r): Cell[] => [
          r.invoiceNo,
          r.customerName,
          r.productName,
          r.dueAt,
          r.bucket,
          r.balanceMinor,
        ]),
      };
    }
    case 'journals': {
      const lines = await generalLedgerLines(fy, mode);
      return {
        header: [
          'Journal',
          'Date',
          'Source',
          'Description',
          'Line',
          'Account',
          'Account name',
          'Debit',
          'Credit',
          'Product',
          'Memo',
        ],
        rows: lines.map((l): Cell[] => [
          l.journalNo,
          l.occurredAt,
          l.source,
          l.description,
          l.lineNo,
          l.accountCode,
          l.accountName,
          l.direction === 'debit' ? l.amountMinor : null,
          l.direction === 'credit' ? l.amountMinor : null,
          l.productId,
          l.memo,
        ]),
      };
    }
    default:
      return null;
  }
}

export async function GET(
  request: Request,
  context: RouteContext<'/api/admin/reports/[report]'>,
) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const { report } = await context.params;
  const [mode, fy] = await Promise.all([
    adminMode(),
    resolveFiscalYear(new URL(request.url).searchParams.get('fy') ?? undefined),
  ]);
  if (!fy)
    return NextResponse.json({ message: 'No fiscal year.' }, { status: 404 });

  const built = await build(report, fy, mode);
  if (!built)
    return NextResponse.json({ message: 'No such report.' }, { status: 404 });

  await recordAudit({
    actorType: 'admin',
    actorId: guard.adminId,
    action: 'ledger.export',
    resourceType: 'report',
    resourceId: report,
    afterState: { fiscalYear: fy, mode },
  });

  const books = mode === 'live' ? 'production' : 'sandbox';
  const filename = `softmato-${report}-${fy.replace('/', '-')}-${books}.csv`;

  return new Response(toCsv(built.header, built.rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}
