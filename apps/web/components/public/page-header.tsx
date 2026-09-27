import { BlurIn } from '@/components/motion/blur-in';

/**
 * The top of an inner page: eyebrow, title, lead.
 *
 * Set at the marketing surface's display scale rather than the old 32px,
 * because these pages sit under the same floating header and on the same lit
 * ground as the home page — a 32px title under a 100px arc reads as a
 * different website. It stops well short of the home hero's size: the hero is
 * a picture with a name in it, and this is the top of something to read.
 *
 * The title resolves out of a blur on arrival, the same entrance the home
 * page's section headings use, so a navigation between the two feels like one
 * site moving rather than two pages swapping.
 *
 * `art` is the page's mark (page-art.tsx), set opposite the title rather than
 * above it: the title stays the first thing read, the mark a quiet second.
 * Hidden on narrow screens, where it would only push the page down.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  art,
}: {
  eyebrow?: string | undefined;
  title: string;
  lead?: string | null | undefined;
  art?: React.ReactNode;
}) {
  return (
    <header>
      <div className="flex items-center justify-between gap-12">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}

          <BlurIn
            as="h1"
            className="display mt-5 max-w-[18ch] text-[clamp(2.5rem,7vw,4.5rem)]"
          >
            {title}
          </BlurIn>

          {lead ? (
            <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-muted-foreground">
              {lead}
            </p>
          ) : null}
        </div>

        {art ? <div className="hidden shrink-0 md:block">{art}</div> : null}
      </div>

      <hr className="rule mt-12" />
    </header>
  );
}
