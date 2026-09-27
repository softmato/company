import { REQUEST } from '@/lib/home/how-we-work';

import { WorkAvatar } from './work-avatar';

/**
 * Beat one: a client whose site we built and still run asks for a change.
 * The message, and under it their website, drawn — two pages that are there
 * and a dashed slot where the new one goes. The picture says "add this here"
 * before the words are read.
 */
export function WorkRequestCard() {
  return (
    <div className="float-card w-[16.5rem] p-3.5">
      <div className="flex items-start gap-2.5">
        <WorkAvatar who="client" className="size-9" />
        <p className="rounded-2xl rounded-tl-md bg-surface px-3 py-2 text-[13px] leading-snug text-foreground">
          {REQUEST}
        </p>
      </div>

      {/* Their website, drawn. */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <div className="flex gap-1 border-b border-border bg-surface px-2.5 py-1.5">
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <span className="size-1.5 rounded-full bg-foreground/15" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-2.5">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="flex h-9 flex-col justify-center gap-1 rounded-lg border border-border bg-card px-2"
            >
              <span className="block h-1.5 w-4/5 rounded-full bg-surface-strong" />
              <span className="block h-1.5 w-1/2 rounded-full bg-surface-strong" />
            </span>
          ))}
          <span className="request-slot flex h-9 items-center justify-center rounded-lg border border-dashed border-primary/60 bg-primary/5 text-[15px] font-semibold leading-none text-primary">
            +
          </span>
        </div>
      </div>
    </div>
  );
}
