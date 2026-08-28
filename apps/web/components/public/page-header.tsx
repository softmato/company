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
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string | undefined;
  title: string;
  lead?: string | null | undefined;
}) {
  return (
    <header>
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

      <hr className="rule mt-12" />
    </header>
  );
}
