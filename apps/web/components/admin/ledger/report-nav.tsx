import Link from 'next/link';

import { cn } from '@/lib/cn';

export const REPORTS = [
  { id: 'trial-balance', label: 'Trial balance' },
  { id: 'profit-and-loss', label: 'Profit & loss' },
  { id: 'balance-sheet', label: 'Balance sheet' },
  { id: 'by-product', label: 'By product' },
  { id: 'receivables', label: 'Receivables aging' },
] as const;

export type ReportId = (typeof REPORTS)[number]['id'];

export function isReportId(value: string | undefined): value is ReportId {
  return REPORTS.some((r) => r.id === value);
}

/** Links, not buttons: each report has its own URL an accountant can be sent. */
export function ReportNav({
  active,
  fiscalYear,
}: {
  active: ReportId;
  fiscalYear: string;
}) {
  return (
    <nav
      aria-label="Reports"
      className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
    >
      {REPORTS.map((r) => (
        <Link
          key={r.id}
          href={`/admin/reports?report=${r.id}&fy=${encodeURIComponent(fiscalYear)}`}
          aria-current={r.id === active ? 'page' : undefined}
          className={cn(
            'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            r.id === active
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  );
}
