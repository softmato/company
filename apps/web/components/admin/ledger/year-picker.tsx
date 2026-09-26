'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Select } from '@/components/admin/projects/select';

/** The fiscal year a ledger page describes, kept in the URL. */
export function YearPicker({
  years,
  value,
}: {
  years: string[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Fiscal year
      <Select
        value={value}
        disabled={pending}
        className="font-mono"
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.set('fy', event.target.value);
          next.delete('page');
          startTransition(() =>
            router.replace(`${pathname}?${next}`, { scroll: false }),
          );
        }}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </label>
  );
}
