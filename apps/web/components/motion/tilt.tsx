'use client';

import { useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

/**
 * Leans its child toward the pointer in 3D, and settles back when it leaves.
 *
 * Two custom properties and one CSS transition (`.tilt` in marketing.css) —
 * no loop, no library. The pointer sets `--rx`/`--ry` directly; the
 * transition does the easing. Mouse only and never under reduced motion.
 */
export function Tilt({
  children,
  max = 7,
  className,
}: {
  children: ReactNode;
  /** Degrees at the edge. */
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const set = (rx: number, ry: number) => {
    ref.current?.style.setProperty('--rx', `${rx}deg`);
    ref.current?.style.setProperty('--ry', `${ry}deg`);
  };

  return (
    <div
      ref={ref}
      className={cn('tilt', className)}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || prefersReducedMotion()) return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        set(-y * max, x * max);
      }}
      onPointerLeave={() => set(0, 0)}
    >
      {children}
    </div>
  );
}
