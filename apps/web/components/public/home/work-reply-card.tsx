import { REPLY, REPLY_ATTACHMENT } from '@/lib/home/how-we-work';

import { WorkAvatar } from './work-avatar';

/**
 * Beat two: the engineer answers — in the brand green, as the reply side of a
 * chat — with the written scope attached as a file. The attachment is the
 * lede's "scope is written down", shown as an object instead of a sentence.
 */
export function WorkReplyCard() {
  return (
    <div className="float-card w-[16rem] p-3.5">
      <div className="flex items-start gap-2.5">
        <WorkAvatar who="engineer" className="size-9" />
        <div className="min-w-0">
          <p className="rounded-2xl rounded-tl-md bg-primary px-3 py-2 text-[13px] leading-snug text-primary-foreground">
            {REPLY}
          </p>

          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card p-2">
            <span className="grid size-8 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block h-1.5 w-4/5 rounded-full bg-surface-strong" />
              <span className="mt-1.5 block truncate text-[11.5px] font-medium text-foreground">
                {REPLY_ATTACHMENT}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
