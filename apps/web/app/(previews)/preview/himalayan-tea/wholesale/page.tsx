import type { Metadata } from 'next';
import { BadgeCheck } from 'lucide-react';

import { WholesaleOrder } from '@/components/previews/himalayan-tea/wholesale-order';

export const metadata: Metadata = { title: 'Wholesale' };

export default function HimalayanTeaWholesale() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-28 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--ht-amber)]">
            Wholesale
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-tea)] text-[40px] leading-tight sm:text-[52px]">
            Your price list
          </h1>
          <p className="mt-3 max-w-[56ch] text-[#1b1a17]/65">
            Order by the carton of twenty tins. Prices are yours alone, set by
            the tea company for your account.
          </p>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-[#1b1a17]/8">
          <BadgeCheck
            className="size-4 text-[var(--ht-leaf)]"
            aria-hidden="true"
          />
          Signed in as a demo buyer
        </p>
      </div>
      <div className="mt-10">
        <WholesaleOrder />
      </div>
    </section>
  );
}
