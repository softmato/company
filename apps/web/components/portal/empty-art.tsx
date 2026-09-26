import Image from 'next/image';

import { cn } from '@/lib/cn';

/** An empty section that says what will appear, with a picture of it. */
export function EmptyArt({
  art,
  title,
  description,
  className,
  children,
}: {
  art: string;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center',
        className,
      )}
    >
      <Image
        src={art}
        alt=""
        width={120}
        height={120}
        className="size-24 drop-shadow-sm sm:size-28"
      />
      <p className="headline mt-3 text-[17px]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
