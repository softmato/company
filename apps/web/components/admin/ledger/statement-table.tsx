import Link from 'next/link';

import { DataTable, Td, Th, TotalRow, Tr } from '@/components/ui/table';
import { cn } from '@/lib/cn';
import { formatPaisa } from '@/lib/format/money';
import type { StatementLine } from '@/lib/ledger/statements-math';

export interface StatementSection {
  title: string;
  lines: StatementLine[];
  total: bigint;
  totalLabel: string;
}

/**
 * A statement as sections of account lines, each closed by a total, then
 * any bottom-line figures. Account codes link to the account's ledger so
 * every figure can be traced to the journals behind it.
 */
export function StatementTable({
  sections,
  results,
  fiscalYear,
}: {
  sections: StatementSection[];
  results: { label: string; amountMinor: bigint; strong?: boolean }[];
  fiscalYear: string;
}) {
  return (
    <DataTable>
      <thead>
        <tr>
          <Th className="w-24 pt-3">Code</Th>
          <Th className="pt-3">Account</Th>
          <Th className="pt-3" numeric>
            NPR
          </Th>
        </tr>
      </thead>
      {sections.map((section) => (
        <tbody key={section.title}>
          <tr>
            <td
              colSpan={3}
              className="px-3 pb-1 pt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
            >
              {section.title}
            </td>
          </tr>
          {section.lines.length === 0 ? (
            <Tr>
              <Td colSpan={3} className="text-[13px] text-muted-foreground">
                Nothing posted.
              </Td>
            </Tr>
          ) : (
            section.lines.map((line) => (
              <Tr key={line.code}>
                <Td className="font-mono text-[13px]">
                  <Link
                    href={`/admin/accounts/${line.code}?fy=${encodeURIComponent(fiscalYear)}`}
                    className="hover:text-primary hover:underline"
                  >
                    {line.code}
                  </Link>
                </Td>
                <Td>{line.name}</Td>
                <Td
                  numeric
                  className={cn(line.amountMinor < 0n && 'text-flag')}
                >
                  {formatPaisa(line.amountMinor)}
                </Td>
              </Tr>
            ))
          )}
          <TotalRow>
            <Td />
            <Td>{section.totalLabel}</Td>
            <Td numeric>{formatPaisa(section.total)}</Td>
          </TotalRow>
        </tbody>
      ))}
      <tbody>
        {results.map((r) => (
          <TotalRow
            key={r.label}
            className={cn(r.strong && 'bg-muted text-[15px]')}
          >
            <Td />
            <Td className={cn(r.strong && 'font-semibold')}>{r.label}</Td>
            <Td
              numeric
              className={cn(
                r.strong && 'font-semibold',
                r.amountMinor < 0n && 'text-flag',
              )}
            >
              {formatPaisa(r.amountMinor)}
            </Td>
          </TotalRow>
        ))}
      </tbody>
    </DataTable>
  );
}
