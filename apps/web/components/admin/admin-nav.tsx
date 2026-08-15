/**
 * Admin navigation. Mirrors the structure in docs/FOLDER_STRUCTURE.md —
 * sections whose phase has not been built yet are shown but not linked, so the
 * shape of the system is visible without offering dead ends.
 */
import Link from 'next/link';

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
      { label: 'Products', phase: 3 },
      { label: 'Providers', phase: 3 },
      { label: 'Content', href: '/admin/cms' },
      { label: 'Clients', phase: 8 },
      { label: 'Audit log', phase: 1 },
      { label: 'Settings', href: '/admin/settings' },
    ],
  },
];

export function AdminNav() {
  return (
    <nav
      aria-label="Admin sections"
      className="w-56 shrink-0 border-r border-neutral-200 px-4 py-6"
    >
      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            {section.title}
          </h2>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="flex items-center justify-between px-2 py-1 text-sm text-neutral-400">
                    {item.label}
                    <span className="text-xs">P{item.phase}</span>
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
