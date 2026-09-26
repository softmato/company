import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

import { TONE, type Tone } from './tone';

const SIZES = {
  sm: 'size-8 rounded-lg [&_svg]:size-4',
  md: 'size-10 rounded-xl [&_svg]:size-5',
  lg: 'size-12 rounded-2xl [&_svg]:size-6',
};

/** An icon on a tinted tile — the portal's way of labelling a section. */
export function IconChip({
  icon: Icon,
  tone = 'emerald',
  size = 'md',
  solid = false,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof SIZES;
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center',
        SIZES[size],
        solid
          ? cn(TONE[tone].solid, 'shadow-sm')
          : cn(TONE[tone].chip, 'ring-1 ring-inset'),
        className,
      )}
    >
      <Icon strokeWidth={2} />
    </span>
  );
}
