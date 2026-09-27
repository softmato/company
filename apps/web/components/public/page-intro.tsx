import type { LucideIcon } from 'lucide-react';

import { BlurIn } from '@/components/motion/blur-in';

/**
 * A centred page opening — icon pill, title, lead — for pages that are a
 * catalogue rather than an article (services, plans). `PageHeader` is the
 * left-aligned, ruled version for pages that are read top to bottom.
 */
export function PageIntro({
  icon: Icon,
  eyebrow,
  title,
  lead,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  lead?: string | null | undefined;
}) {
  return (
    <header className="text-center">
      <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-[12.5px] font-medium text-muted-foreground shadow-sm">
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
        {eyebrow}
      </p>

      <BlurIn
        as="h1"
        className="headline mx-auto mt-6 max-w-[16ch] text-[clamp(2.4rem,6vw,3.75rem)] leading-[1.05]"
      >
        {title}
      </BlurIn>

      {lead ? (
        <p className="mx-auto mt-5 max-w-[56ch] text-[16.5px] leading-relaxed text-muted-foreground">
          {lead}
        </p>
      ) : null}
    </header>
  );
}
