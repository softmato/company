'use client';

/**
 * Admin navigation. Mirrors the structure in docs/FOLDER_STRUCTURE.md —
 * sections whose phase has not been built yet are shown but not linked, so the
 * shape of the system is visible without offering dead ends.
 *
 * A client component only because the active item is derived from the path.
 * The sidebar is the one surface with a ground of its own (`--sidebar`); it
 * is a tool, and the tint is what separates the tool from the work.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

interface NavItem {
  label: string;
  href?: string;
  /** Phase that delivers it, shown when there is nothing to link to yet. */
  phase?: number;
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin' }],
  },
  {
    title: 'Money',
    items: [
      { label: 'Payments', phase: 3 },
      { label: 'Approvals', phase: 3 },
      { label: 'Refunds', phase: 4 },
      { label: 'Invoices', phase: 6 },
      { label: 'Subscriptions', phase: 6 },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { label: 'Chart of accounts', phase: 7 },
      { label: 'Journals', phase: 7 },
      { label: 'Reports', phase: 7 },
      { label: 'Periods', phase: 7 },
      { label: 'Reconciliation', phase: 7 },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Products', href: '/admin/products' },
      { label: 'Providers', phase: 3 },
      { label: 'Content', href: '/admin/cms' },
      { label: 'Clients', phase: 8 },
      { label: 'Audit log', href: '/admin/audit' },
      { label: 'Settings', href: '/admin/settings' },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  /*
   * `/admin` matches only itself. Prefix-matching it would light the Dashboard
   * up on every page in the panel, which makes the active state meaningless.
   */
  function isActive(href: string): boolean {
    return href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Admin sections"
      className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar px-3 py-5"
    >
      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-5">
          <h2 className="eyebrow px-2">{section.title}</h2>

          <ul className="mt-2 space-y-0.5">
            {section.items.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'block rounded-md px-2 py-1.5 text-sm transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50',
                      isActive(item.href)
                        ? 'bg-background font-medium text-primary shadow-card'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent',
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  /*
                   * Not a link and not disabled-looking-clickable: plain text
                   * with the phase that delivers it. Someone reading the
                   * sidebar learns the system's shape and learns that this
                   * part is not built, in one glance.
                   */
                  <span className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                    {item.label}
                    <span
                      className="numeric shrink-0 text-[10.5px]"
                      title={`Phase ${item.phase}`}
                    >
                      P{item.phase}
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
