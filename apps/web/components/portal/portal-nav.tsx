'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, LayoutDashboard, Receipt } from 'lucide-react';

import { cn } from '@/lib/cn';

const ITEMS = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: Receipt },
  { label: 'Files', href: '/documents', icon: FolderOpen },
];

/**
 * Pill navigation. A client component only because the active item comes
 * from the path — the browser's path on the agency host, without `/portal`.
 */
export function PortalNav() {
  const pathname = usePathname();

  // A project page belongs to the overview it was opened from.
  const active = (href: string) =>
    href === '/'
      ? pathname === '/' || pathname.startsWith('/projects')
      : pathname.startsWith(href);

  return (
    <nav
      aria-label="Portal"
      className="no-scrollbar flex gap-1 overflow-x-auto"
    >
      {ITEMS.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            active(href)
              ? 'bg-emerald-600 font-medium text-white shadow-sm shadow-emerald-600/25'
              : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
