'use client';

import { useState } from 'react';

import { cn } from '@/lib/cn';

import { KINDS, TEAS, type TeaKind } from './catalogue';
import { TeaCard } from './tea-card';

/** Every tea, with a row of chips to narrow it to one kind. */
export function ShopGrid() {
  const [kind, setKind] = useState<TeaKind | null>(null);
  const shown = kind ? TEAS.filter((t) => t.kind === kind) : TEAS;

  return (
    <>
      <div
        role="group"
        aria-label="Filter by kind"
        className="flex flex-wrap gap-2"
      >
        {[null, ...KINDS].map((k) => (
          <button
            key={k ?? 'all'}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              'h-9 rounded-full px-4 text-sm transition-colors',
              kind === k
                ? 'bg-[var(--ht-green)] text-[var(--ht-cream)]'
                : 'bg-white text-[#1b1a17]/70 ring-1 ring-[#1b1a17]/10 hover:text-[#1b1a17]',
            )}
          >
            {k ?? 'All teas'}
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((tea) => (
          <TeaCard key={tea.id} tea={tea} />
        ))}
      </div>
    </>
  );
}
