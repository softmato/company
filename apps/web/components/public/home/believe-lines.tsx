import { useId } from 'react';

import { BOXES, FLOW_Y, FRAME } from '@/lib/home/believe';

/**
 * The blueprint behind the diagram, and the wires through it.
 *
 * Coordinates are the 1152 × 760 frame from `lib/home/believe.ts`; the HTML
 * cards sit on the same numbers, so the ends of these lines are the edges of
 * those cards. Rounded corners rather than right angles, as in the reference:
 * a square corner reads as a table border, a rounded one as a route.
 *
 * Every path carries `data-draw` naming the beat it draws on in
 * `use-believe-motion.ts`. Dashed lines cannot be drawn with DrawSVG directly
 * — it owns `stroke-dasharray` — so each one is revealed through a mask whose
 * solid twin is what actually draws.
 */

const Y = FLOW_Y;
const HUB = BOXES.hub;
const SEE_RIGHT = BOXES.see.x + BOXES.see.w;
const NODE_CYS = BOXES.nodes.map((n) => n.y + n.h / 2);
const NODE_X = BOXES.nodes[0]!.x;
const NODE_R = NODE_X + BOXES.nodes[0]!.w;

const GRID: { d: string; dashed?: boolean }[] = [
  { d: 'M0 320 H240 Q272 320 272 352 V760' },
  { d: 'M142 0 V236 Q142 266 112 266 H0', dashed: true },
  { d: 'M1152 288 H932 Q900 288 900 320', dashed: true },
  { d: 'M1016 0 V222 Q1016 250 1044 250 H1152' },
  { d: 'M900 670 V760' },
  { d: 'M400 430 H750', dashed: true },
  { d: 'M400 630 H750', dashed: true },
  { d: 'M600 400 V660', dashed: true },
];

const IN = NODE_CYS.map(
  (cy) => `M${SEE_RIGHT} ${Y} C${SEE_RIGHT + 30} ${Y} ${NODE_X - 30} ${cy} ${NODE_X} ${cy}`,
);
const TO_HUB = NODE_CYS.map(
  (cy) => `M${NODE_R} ${cy} C${NODE_R + 15} ${cy} ${HUB.x - 15} ${Y} ${HUB.x} ${Y}`,
);
const OUT = `M${HUB.x + HUB.w} ${Y} H${BOXES.right.x}`;
const DROP = `M${BOXES.chip.x + BOXES.chip.w / 2} ${BOXES.chip.y + BOXES.chip.h} V${BOXES.right.y}`;

export function BelieveLines() {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
      fill="none"
      className="pointer-events-none absolute inset-0 hidden size-full lg:block"
    >
      <defs>
        {GRID.map(
          (line, i) =>
            line.dashed && (
              <mask
                key={i}
                id={`${id}-m${i}`}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={FRAME.w}
                height={FRAME.h}
              >
                <path d={line.d} stroke="#fff" strokeWidth="6" data-draw="grid" />
              </mask>
            ),
        )}
      </defs>

      <g className="text-foreground" stroke="currentColor" strokeOpacity="0.13">
        {GRID.map((line, i) =>
          line.dashed ? (
            <path
              key={i}
              d={line.d}
              strokeDasharray="5 7"
              mask={`url(#${id}-m${i})`}
            />
          ) : (
            <path key={i} d={line.d} data-draw="grid" />
          ),
        )}
      </g>

      <g className="text-primary" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4">
        {IN.map((d) => (
          <path key={d} d={d} data-draw="in" />
        ))}
        {TO_HUB.map((d) => (
          <path key={d} d={d} data-draw="hub" />
        ))}
        <path d={OUT} data-draw="out" />
        <path d={DROP} data-draw="drop" />
      </g>

      {/* The current: short dashes running left to right once the wires are up. */}
      <g className="believe-flow text-glow" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {[...IN, ...TO_HUB, OUT].map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
