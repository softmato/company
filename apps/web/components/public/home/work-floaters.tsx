import { Drift } from '@/components/motion/drift';
import { StaggerIn } from '@/components/motion/stagger-in';

import { WorkCursorTag } from './work-cursor-tag';
import { WorkReplyCard } from './work-reply-card';
import { WorkRequestCard } from './work-request-card';

/**
 * The things floating round the headline, placed as in the reference: the
 * client's request top-left, the engineer's cursor top-right with the reply
 * under it. Read left to right it is the story's first two beats — ask,
 * answer — with the headline between them.
 *
 * There is no "You" tag here: the visitor's own pointer is drawn as the
 * client's cursor while it is in this section (`SectionCursor` in
 * `statement.tsx`), so the reader is the one who asked.
 *
 * `lg` and up only. Below that there is no margin beside a centred headline to
 * float anything in, and cards laid over the words are worse than no cards.
 *
 * Three nested layers per item, one transform each: the `div` is placed and
 * tilted (`rotate` is its own CSS property in Tailwind 4, so it does not fight
 * GSAP's `transform`), `StaggerIn` owns the entrance, `Drift` the idle float —
 * and the cursor tags add their own wander inside that.
 */
const ITEMS = [
  {
    at: 'left-0 top-0 -rotate-[4deg]',
    drift: 9,
    period: 6.2,
    node: <WorkRequestCard />,
  },
  {
    at: 'right-[8%] top-[2%]',
    drift: 8,
    period: 5.7,
    node: <WorkCursorTag who="engineer" side="right" period={11} />,
  },
  {
    at: 'right-0 top-[36%] rotate-[3deg]',
    drift: 10,
    period: 6.9,
    node: <WorkReplyCard />,
  },
];

export function WorkFloaters() {
  return (
    /* Decorative: the headline and lede say all of it in words. */
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden lg:block"
    >
      <StaggerIn onScroll delay={0.35} className="relative size-full">
        {ITEMS.map((item, i) => (
          <div key={i} className={`absolute ${item.at}`}>
            <Drift distance={item.drift} duration={item.period}>
              {item.node}
            </Drift>
          </div>
        ))}
      </StaggerIn>
    </div>
  );
}
