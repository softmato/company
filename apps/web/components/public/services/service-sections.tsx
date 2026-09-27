import { splitSections } from '@/lib/markdown/sections';
import { Markdown } from '@/components/public/markdown';

/**
 * A service body set as panels: the opening paragraph large, then each `##`
 * section in its own card, two up. A body with no headings falls back to one
 * card of prose.
 */
export function ServiceSections({ body }: { body: string }) {
  const { lede, sections } = splitSections(body);

  return (
    <section className="mt-20">
      {lede ? (
        <p className="max-w-[60ch] text-[clamp(1.15rem,2.2vw,1.4rem)] leading-relaxed">
          {lede}
        </p>
      ) : null}

      {sections.length ? (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title || 'intro'}
              className="rounded-3xl border border-border bg-card p-6 shadow-card marker:text-primary sm:p-7 [&>div>*:first-child]:mt-0"
            >
              {section.title ? (
                <h2 className="headline mb-4 text-[20px]">{section.title}</h2>
              ) : null}
              <Markdown>{section.body}</Markdown>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
