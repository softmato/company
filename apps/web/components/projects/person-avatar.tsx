import Image from 'next/image';

import { BRAND_MARK_192 } from '@/lib/brand/assets';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/initials';

const GRADIENTS = [
  'from-violet-400 to-fuchsia-500',
  'from-sky-400 to-blue-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-teal-400 to-emerald-600',
];

function hash(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/**
 * Someone in a thread. Softmato's side wears the company mark, so a client
 * sees at a glance which replies came from the team; each client person gets
 * a stable colour from their name.
 */
export function PersonAvatar({
  name,
  softmato,
  className,
}: {
  name: string;
  softmato: boolean;
  className?: string;
}) {
  if (softmato) {
    return (
      <Image
        src={BRAND_MARK_192}
        alt=""
        width={32}
        height={32}
        className={cn(
          'size-8 shrink-0 rounded-full bg-white ring-2 ring-emerald-500/20',
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br font-mono text-[11px] font-medium text-white',
        GRADIENTS[hash(name) % GRADIENTS.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
