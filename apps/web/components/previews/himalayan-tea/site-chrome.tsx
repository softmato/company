import Link from 'next/link';

import { CartButton } from './cart';

function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
      <circle cx="16" cy="16" r="16" fill="var(--ht-green)" />
      <path
        d="M16 7c-6 3-8 9-6 16 6-1 9-6 6-16Zm0 0c6 3 8 9 6 16-6-1-9-6-6-16Z"
        fill="#c9e3b1"
      />
    </svg>
  );
}

const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/#gardens', label: 'Our gardens' },
  { href: '/wholesale', label: 'Wholesale' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#1b1a17]/8 bg-[var(--ht-cream)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-[family-name:var(--font-tea)] text-[19px] font-semibold tracking-tight">
            Himalayan Tea Co.
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-7 text-sm text-[#1b1a17]/75 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-[var(--ht-green)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto sm:ml-0">
          <CartButton />
        </div>
      </div>
      <nav className="flex justify-center gap-6 border-t border-[#1b1a17]/8 py-2 text-sm text-[#1b1a17]/75 sm:hidden">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-[#16301f] text-[#e9e2d2]">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-[family-name:var(--font-tea)] text-2xl">
            Himalayan Tea Co.
          </p>
          <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-[#e9e2d2]/70">
            Single-estate tea from the hills of eastern Nepal, packed in small
            batches.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Shop</p>
          <ul className="mt-3 space-y-2 text-[#e9e2d2]/70">
            <li>
              <Link href="/shop" className="hover:text-white">
                All teas
              </Link>
            </li>
            <li>
              <Link href="/wholesale" className="hover:text-white">
                Wholesale price list
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium">Visit</p>
          <p className="mt-3 text-[#e9e2d2]/70">Ilam, Koshi Province, Nepal</p>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-[#e9e2d2]/50">
        Site preview · built by Softmato
      </p>
    </footer>
  );
}
