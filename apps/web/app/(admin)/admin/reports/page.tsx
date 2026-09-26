/**
 * `/admin/reports?report=profit-and-loss&fy=2083/84` — the financial
 * statements (Phase 7). Read only; every figure links through to the account
 * ledger and from there to the journals behind it.
 */
import type { Metadata } from 'next';

import { AgingReport } from '@/components/admin/ledger/aging-report';
import { BalanceSheetReport } from '@/components/admin/ledger/balance-sheet-report';
import { LedgerHeader } from '@/components/admin/ledger/ledger-header';
import { ProductPlReport } from '@/components/admin/ledger/product-pl-report';
import { ProfitLossReport } from '@/components/admin/ledger/profit-loss-report';
import {
  isReportId,
  ReportNav,
  REPORTS,
  type ReportId,
} from '@/components/admin/ledger/report-nav';
import { TrialBalanceReport } from '@/components/admin/ledger/trial-balance-report';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { adminMode } from '@/lib/admin/mode';
import {
  loadBalanceSheet,
  loadProductPl,
  loadProfitAndLoss,
  loadTrialBalance,
  receivablesAging,
} from '@/lib/ledger/reports';
import { fiscalYears, resolveFiscalYear } from '@/lib/ledger/scope';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Reports' };

const LEADS: Record<ReportId, string> = {
  'trial-balance':
    'Every account with postings this year, debits against credits. The two totals must match.',
  'profit-and-loss':
    'Revenue less direct costs and operating expenses for the year.',
  'balance-sheet':
    'What the company owns and owes at the end of the year, cumulative since the first posting.',
  'by-product':
    'The profit and loss split by the product each ledger line is tagged with.',
  receivables:
    'Unpaid invoices by how late they are, as of today. Not tied to a fiscal year.',
};

export default async function ReportsPage({
  searchParams,
}: PageProps<'/admin/reports'>) {
  const params = await searchParams;
  const report: ReportId = isReportId(params.report as string | undefined)
    ? (params.report as ReportId)
    : 'trial-balance';
  const [mode, years, fiscalYear] = await Promise.all([
    adminMode(),
    fiscalYears(),
    resolveFiscalYear(params.fy as string | undefined),
  ]);

  if (!fiscalYear) {
    return (
      <EmptyState
        title="No fiscal periods"
        description="Run the seed to create the fiscal periods for the current year."
      />
    );
  }

  const label = REPORTS.find((r) => r.id === report)!.label;

  return (
    <div className="space-y-5">
      <LedgerHeader
        title="Reports"
        lead={LEADS[report]}
        mode={mode}
        years={years}
        fiscalYear={fiscalYear}
        actions={
          <a
            href={`/api/admin/reports/${report}?fy=${encodeURIComponent(fiscalYear)}`}
            className={buttonClasses('secondary', 'sm')}
            download
          >
            Export {label} (CSV)
          </a>
        }
      />
      <ReportNav active={report} fiscalYear={fiscalYear} />
      <Report report={report} fiscalYear={fiscalYear} mode={mode} />
    </div>
  );
}

async function Report({
  report,
  fiscalYear,
  mode,
}: {
  report: ReportId;
  fiscalYear: string;
  mode: 'test' | 'live';
}) {
  switch (report) {
    case 'trial-balance':
      return (
        <TrialBalanceReport
          tb={await loadTrialBalance(fiscalYear, mode)}
          fiscalYear={fiscalYear}
        />
      );
    case 'profit-and-loss':
      return (
        <ProfitLossReport
          pl={await loadProfitAndLoss(fiscalYear, mode)}
          fiscalYear={fiscalYear}
        />
      );
    case 'balance-sheet':
      return (
        <BalanceSheetReport
          bs={await loadBalanceSheet(fiscalYear, mode)}
          fiscalYear={fiscalYear}
        />
      );
    case 'by-product':
      return <ProductPlReport {...await loadProductPl(fiscalYear, mode)} />;
    case 'receivables':
      return <AgingReport {...await receivablesAging(mode)} />;
  }
}
