'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

/**
 * Replaces the pointer with a drawn cursor, and a label that trails it, while
 * the mouse is inside the parent element.
 *
 * animate-ui's `Cursor` + `CursorFollow`, without `motion` (UI_BRIEF §6): the
 * arrow is pinned to the pointer and the label chases it with a per-frame
 * lerp, which is the spring's feel. Under reduced motion the label is pinned
 * too.
 *
 * Mount it as the last child of the area it covers. It reads its own parent as
 * that area, hides the native cursor there (`.section-cursor-area` in
 * marketing.css) and draws with `position: fixed`, so it stays under the real
 * pointer through a scroll. Fine pointers only — on touch there is no cursor
 * to replace, and it renders nothing.
 *
 * The loop only runs while the label is still catching up; a still mouse costs
 * nothing.
 */
const EASE = 0.18;

export function SectionCursor({
  arrow,
  label,
}: {
  arrow: ReactNode;
  label: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const area = root?.parentElement;
    const arrowEl = arrowRef.current;
    const labelEl = labelRef.current;
    if (!root || !area || !arrowEl || !labelEl) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const ease = prefersReducedMotion() ? 1 : EASE;
    const target = { x: 0, y: 0 };
    const trail = { x: 0, y: 0 };
    let frame = 0;
    let shown = false;

    const place = (el: HTMLElement, x: number, y: number) => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const tick = () => {
      trail.x += (target.x - trail.x) * ease;
      trail.y += (target.y - trail.y) * ease;
      place(labelEl, trail.x, trail.y);
      const settled =
        Math.abs(target.x - trail.x) < 0.3 && Math.abs(target.y - trail.y) < 0.3;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      target.x = e.clientX;
      target.y = e.clientY;
      place(arrowEl, target.x, target.y);
      if (!shown) {
        /* Arrive with the label already under the pointer, not flying in. */
        trail.x = target.x;
        trail.y = target.y;
        place(labelEl, trail.x, trail.y);
        root.dataset.active = '';
        shown = true;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const leave = () => {
      delete root.dataset.active;
      shown = false;
    };

    area.classList.add('section-cursor-area');
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerleave', leave);

    return () => {
      cancelAnimationFrame(frame);
      area.classList.remove('section-cursor-area');
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="section-cursor">
      <div ref={arrowRef} className="section-cursor__part">
        {arrow}
      </div>
      <div ref={labelRef} className="section-cursor__part">
        {label}
      </div>
    </div>
  );
}
