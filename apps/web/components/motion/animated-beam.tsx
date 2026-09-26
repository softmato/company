'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

/**
 * A curved line between two elements with a light travelling along it.
 *
 * Magic UI's `animated-beam`, ported from `motion` to GSAP: the only thing
 * `motion` did was sweep the gradient's x1/x2 in a loop, and UI_BRIEF §6 rules
 * out a second animation library for that. Colours default to tokens rather
 * than the original's hex.
 *
 * Place it inside `containerRef` (which needs `position: relative`); the path
 * is recomputed whenever the container resizes. Under reduced motion the static
 * path still draws and only the travelling light is dropped.
 */
export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 5,
  delay = 0,
  pathColor = 'var(--border)',
  pathWidth = 2,
  pathOpacity = 1,
  gradientStartColor = 'var(--primary)',
  gradientStopColor = 'var(--primary)',
  repeat = -1,
  repeatDelay = 0,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: {
  className?: string | undefined;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  /** Pixels the midpoint bows upward; negative bows down. */
  curvature?: number;
  reverse?: boolean;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  /** Seconds. */
  delay?: number;
  /** Seconds per pass. */
  duration?: number;
  /** GSAP semantics: -1 loops forever. */
  repeat?: number;
  repeatDelay?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}) {
  const id = useId();
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  const [pathD, setPathD] = useState('');
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updatePath = () => {
      const container = containerRef.current;
      const from = fromRef.current;
      const to = toRef.current;

      if (!container || !from || !to) return;

      const box = container.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();

      setSize({ width: box.width, height: box.height });

      const startX = a.left - box.left + a.width / 2 + startXOffset;
      const startY = a.top - box.top + a.height / 2 + startYOffset;
      const endX = b.left - box.left + b.width / 2 + endXOffset;
      const endY = b.top - box.top + b.height / 2 + endYOffset;

      setPathD(
        `M ${startX},${startY} Q ${(startX + endX) / 2},${startY - curvature} ${endX},${endY}`,
      );
    };

    const observer = new ResizeObserver(updatePath);

    if (containerRef.current) observer.observe(containerRef.current);
    updatePath();

    return () => observer.disconnect();
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
  ]);

  useEffect(() => {
    const gradient = gradientRef.current;

    if (!gradient || prefersReducedMotion()) return;

    registerMotionPlugins();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        gradient,
        { attr: reverse ? { x1: '90%', x2: '100%' } : { x1: '10%', x2: '0%' } },
        {
          attr: reverse ? { x1: '-10%', x2: '0%' } : { x1: '110%', x2: '100%' },
          duration,
          delay,
          repeat,
          repeatDelay,
          ease: 'expo.out',
          // A forever loop, so it only ticks while the beam is on screen.
          scrollTrigger: {
            trigger: gradient.ownerSVGElement ?? gradient,
            toggleActions: 'play pause resume pause',
          },
        },
      );
    });

    return () => ctx.revert();
  }, [reverse, duration, delay, repeat, repeatDelay]);

  return (
    <svg
      fill="none"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      aria-hidden="true"
      className={cn('pointer-events-none absolute top-0 left-0', className)}
    >
      <path
        d={pathD}
        style={{ stroke: pathColor }}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        stroke={`url(#${id})`}
        strokeWidth={pathWidth}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          ref={gradientRef}
          id={id}
          gradientUnits="userSpaceOnUse"
          x1="0%"
          x2="0%"
          y1="0%"
          y2="0%"
        >
          <stop style={{ stopColor: gradientStartColor, stopOpacity: 0 }} />
          <stop style={{ stopColor: gradientStartColor }} />
          <stop offset="32.5%" style={{ stopColor: gradientStopColor }} />
          <stop
            offset="100%"
            style={{ stopColor: gradientStopColor, stopOpacity: 0 }}
          />
        </linearGradient>
      </defs>
    </svg>
  );
}
