'use client';

import { Children, useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

/**
 * A feed where a new item drops in at the top every `delay` ms and pushes the
 * rest down.
 *
 * Magic UI's `animated-list`, without `motion` (UI_BRIEF §6). Its two effects
 * were a scale-in and a `layout` FLIP that slid the older items down; here both
 * are one CSS animation on the new row (`.animated-list-enter` in
 * marketing.css): the row grows from `0fr` to `1fr`, which is the slide, while
 * its content scales up, which is the pop.
 *
 * Two changes from the original. It loops — the original stops at the last
 * child, so a demo padded to 40 items dies after 40 seconds — and it keeps only
 * `visible` rows mounted, so the DOM does not grow for the life of the page.
 * It also starts full: the first render already shows `visible` rows, so the
 * card is never an empty box waiting for its first tick, and the server render
 * is the finished picture.
 *
 * The clock stops off screen and never starts under reduced motion.
 */
export function AnimatedList({
  children,
  delay = 2200,
  visible = 5,
  className,
}: {
  children: ReactNode;
  delay?: number;
  visible?: number;
  className?: string;
}) {
  const items = Children.toArray(children);
  const start = Math.min(visible, items.length) - 1;
  const [head, setHead] = useState(start);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || items.length < 2) return;

    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry?.isIntersecting) {
        timer = window.setInterval(() => setHead((h) => h + 1), delay);
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [delay, items.length]);

  const rows: number[] = [];
  for (let k = head; k > head - visible && k >= 0; k--) rows.push(k);

  return (
    <div ref={ref} className={cn('flex flex-col', className)}>
      {rows.map((k) => (
        <div key={k} className={cn('grid', k > start && 'animated-list-enter')}>
          <div className="min-h-0 pb-3">{items[k % items.length]}</div>
        </div>
      ))}
    </div>
  );
}
