import type { Tier } from '@/lib/plans/tiers';

/**
 * One monoline mark per plan: a hub with more linked parts at each step —
 * one link for static, three for advanced, a joined network for custom. Ink
 * only, with a single brand dot in the hub, so the marks read as one family
 * and never compete with the text.
 */
type Point = [number, number];

const MARKS: Record<
  Tier['id'],
  { hub: Point; nodes: Point[]; ring?: Point[] }
> = {
  static: { hub: [32, 48], nodes: [[32, 14]] },
  advanced: {
    hub: [32, 48],
    nodes: [
      [32, 12],
      [9, 26],
      [55, 26],
    ],
  },
  custom: {
    hub: [32, 34],
    nodes: [
      [32, 8],
      [9, 20],
      [55, 20],
      [12, 54],
      [52, 54],
    ],
    ring: [
      [9, 20],
      [32, 8],
      [55, 20],
    ],
  },
};

export function PlanArt({
  plan,
  className,
}: {
  plan: Tier['id'];
  className?: string;
}) {
  const { hub, nodes, ring } = MARKS[plan];

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {nodes.map(([x, y]) => (
        <line key={`l${x}-${y}`} x1={hub[0]} y1={hub[1]} x2={x} y2={y} />
      ))}
      {ring ? (
        <polyline points={ring.map((p) => p.join(',')).join(' ')} />
      ) : null}
      {nodes.map(([x, y]) => (
        <circle key={`n${x}-${y}`} cx={x} cy={y} r={4} className="fill-card" />
      ))}
      <circle cx={hub[0]} cy={hub[1]} r={5.5} className="fill-card" />
      <circle
        cx={hub[0]}
        cy={hub[1]}
        r={2}
        className="fill-primary"
        stroke="none"
      />
    </svg>
  );
}
