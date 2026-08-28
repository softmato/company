import Link from 'next/link';

import type { ContentRow, ListColumn } from '@/lib/cms';
import { Card } from '@/components/ui/card';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/admin/status-badge';

/**
 * The list view for one content kind, on the shared banded table.
 *
 * The band is structural, never hover-only — it is there so the eye tracks a
 * row across the columns, which is the same reason a ledger uses it.
 */

/** Columns whose values are figures and must be set in tabular mono. */
const NUMERIC_FIELDS = new Set(['version', 'sortOrder']);

export function ContentTable({
  kindSlug,
  columns,
  rows,
}: {
  kindSlug: string;
  columns: readonly ListColumn[];
  rows: ContentRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        className="mt-6"
        title="Nothing of this kind yet"
        description="Entries appear here once they are created. Each one starts as a draft and stays off the public site until it is published."
      />
    );
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <DataTable>
        <thead>
          <tr>
            {columns.map((col) => (
              <Th key={col.field} numeric={NUMERIC_FIELDS.has(col.field)}>
                {col.label}
              </Th>
            ))}
            <Th>Status</Th>
            <Th className="text-right">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <Tr key={row.id}>
              {columns.map((col) => (
                <Td key={col.field} numeric={NUMERIC_FIELDS.has(col.field)}>
                  {display(row[col.field])}
                </Td>
              ))}
              <Td>
                <StatusBadge status={row.status} />
              </Td>
              <Td className="text-right">
                <Link
                  href={`/admin/cms/${kindSlug}/${row.id}`}
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  Edit
                </Link>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
    </Card>
  );
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
