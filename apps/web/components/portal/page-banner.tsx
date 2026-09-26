import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

import { IconChip } from './icon-chip';
import { TONE, type Tone } from './tone';

/** The top of a list page (invoices, files): icon, title, a line, a picture. */
export function PageBanner({
  icon,
  tone,
  eyebrow,
  title,
  description,
  art,
  aside,
}: {
  icon: LucideIcon;
  tone: Tone;
  eyebrow: string;
  title: string;
  description: string;
  art: string;
  aside?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'relative isolate flex items-center gap-5 overflow-hidden rounded-3xl border bg-gradient-to-br from-white p-6 shadow-card sm:p-7',
        TONE[tone].soft,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-gradient-to-br opacity-25 blur-3xl',
          TONE[tone].bar,
        )}
      />
      <IconChip
        icon={icon}
        tone={tone}
        size="lg"
        solid
        className="hidden sm:grid"
      />
      <div className="min-w-0 flex-1">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-1 text-[30px] sm:text-[36px]">{title}</h1>
        <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {aside ? <div className="mt-4">{aside}</div> : null}
      </div>
      <Image
        src={art}
        alt=""
        width={140}
        height={140}
        priority
        className="hidden size-28 drop-shadow-lg sm:block lg:size-32"
      />
    </section>
  );
}
