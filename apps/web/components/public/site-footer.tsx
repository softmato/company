import Link from 'next/link';

import { cn } from '@/lib/cn';

import { listPublishedLegalDocuments } from '@/lib/cms/public-queries';
import { getSettings } from '@/lib/settings/queries';
import { NAV_LINKS } from '@/components/public/nav-links';
import { Wordmark } from '@/components/public/wordmark';

/**
 * The foot of every public page.
 *
 * It carries the long tail the header's pill deliberately does not — Careers,
 * Contact, and every legal document — so those are reachable without the
 * navigation following the reader down the page to offer them.
 *
 * The legal list is not written out here: it is whatever is published, so a
 * new policy appears in the footer of every page the moment it goes live and
 * nothing has to be kept in step by hand.
 *
 * Legal links come from the CMS, so a policy that has not been published yet
 * does not appear. A link to an unpublished policy would 404, which on a legal
 * page is worse than no link.
 *
 * The contact block reads platform settings rather than hardcoding an address:
 * a founder moves office by editing a form, not by waiting for a deploy.
 */
export async function SiteFooter({ className }: { className?: string | undefined }) {
  const [legal, settings] = await Promise.all([
    listPublishedLegalDocuments(),
    getSettings(),
  ]);

  const address = settings.text('company.address');
  const email = settings.text('company.support_email');

  return (
    <footer className={cn('stage border-t border-border', className)}>
      {/*
        The page's last light, low and wide. It sits under the footer rather
        than behind it so the ground fades out at the bottom of the document
        instead of stopping at a border.
      */}
      <div
        className="bloom opacity-50"
        style={{ '--bloom-x': '50%', '--bloom-y': '128%' } as React.CSSProperties}
      />

      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Wordmark className="text-[22px]" />
            <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-muted-foreground">
              Softmato Technology Pvt Ltd — software products and project work,
              built in Kathmandu.
            </p>

            {/*
              Address only. `company.phone` is deliberately not rendered on any
              public surface — it stays in settings because invoices need it,
              but a number in the footer of every page is a number scraped off
              every page. Email and the contact form are the public routes.
            */}
            {address ? (
              <p className="mt-5 text-[14px] text-muted-foreground">{address}</p>
            ) : null}

            {email ? (
              <a
                href={`mailto:${email}`}
                className="mt-2 inline-block text-[14px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {email}
              </a>
            ) : null}
          </div>

          <nav aria-label="Footer">
            <p className="eyebrow">Company</p>
            <ul className="mt-4 grid gap-2.5">
              {[
                ...NAV_LINKS,
                { href: '/careers', label: 'Careers' },
                { href: '/contact', label: 'Contact' },
                /*
                 * Linked as the path, not as `developer.softmato.com`. The
                 * subdomain is a rewrite onto this route, so the path is the
                 * address that resolves everywhere — including in a preview
                 * deployment, where the subdomain does not exist.
                 */
                { href: '/developers', label: 'Developers' },
              ].map(
                (link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ),
              )}
            </ul>
          </nav>

          {legal.length > 0 ? (
            <nav aria-label="Legal">
              <p className="eyebrow">Legal</p>
              <ul className="mt-4 grid gap-2.5">
                {legal.map((doc) => (
                  <li key={doc.slug}>
                    <FooterLink href={`/legal/${doc.slug}`}>{doc.title}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        <p className="mt-16 border-t border-border pt-6 text-[13px] text-muted-foreground">
          © {new Date().getFullYear()} Softmato Technology Pvt Ltd
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[14px] text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}
