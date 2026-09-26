import type { Metadata } from 'next';

import { ShopGrid } from '@/components/previews/himalayan-tea/shop-grid';

export const metadata: Metadata = { title: 'Shop' };

export default function HimalayanTeaShop() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-28 pt-12">
      <p className="text-sm font-medium text-[var(--ht-amber)]">The shop</p>
      <h1 className="mt-1 font-[family-name:var(--font-tea)] text-[40px] leading-tight sm:text-[52px]">
        All our teas
      </h1>
      <p className="mt-3 max-w-[52ch] text-[#1b1a17]/65">
        Every tea comes in a 100 g tin. Free delivery inside the Kathmandu
        valley on orders over Rs 2,000.
      </p>
      <div className="mt-8">
        <ShopGrid />
      </div>
    </section>
  );
}
