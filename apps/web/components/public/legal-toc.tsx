import type { Heading } from '@/lib/cms/headings';

/**
 * "On this page" for a legal document.
 *
 * A policy is read by someone hunting one clause — refunds, liability, what
 * happens to their data. Ordinary anchor links, so it works before any
 * JavaScript arrives and a section can be linked to directly in an email.
 */
export function LegalToc({ headings }: { headings: Heading[] }) {
  if (headings.length < 3) return null;

  return (
    <nav
      aria-label="Sections of this document"
      className="section-frame mt-8 rounded-lg p-5"
    >
      <p className="eyebrow text-xs text-muted-foreground">On this page</p>

      <ol className="numeric mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {headings.map(({ id, text }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              {text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
