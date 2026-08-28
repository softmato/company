import Link from 'next/link';

/**
 * Trail of links, with the current page as unlinked children.
 *
 * An ordered list rather than spans: the trail is a sequence, and a screen
 * reader announcing "list, 3 items" is what tells someone how deep in the
 * panel they are before they hear any of the labels.
 */
export function Breadcrumbs({
  trail,
  children,
}: {
  trail: { label: string; href: string }[];
  children: React.ReactNode;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {trail.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <Link
              href={crumb.href}
              className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {crumb.label}
            </Link>
            <span aria-hidden="true">/</span>
          </li>
        ))}
        <li aria-current="page">{children}</li>
      </ol>
    </nav>
  );
}
