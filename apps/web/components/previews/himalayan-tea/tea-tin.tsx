import { cn } from '@/lib/cn';

import type { Tea } from './catalogue';

/**
 * A tea tin, drawn: lid, cylinder with its shading, and a paper label. The
 * preview has no product photography yet, and a drawn tin in the tea's own
 * colours reads better than a grey placeholder box.
 */
export function TeaTin({ tea, className }: { tea: Tea; className?: string }) {
  const shade = `ht-shade-${tea.id}`;
  const { body, lid, label, ink } = tea.tin;

  return (
    <svg
      viewBox="0 0 120 160"
      aria-hidden="true"
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id={shade} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.18" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="151" rx="44" ry="6" fill="#000" opacity="0.12" />

      <rect x="20" y="38" width="80" height="110" rx="7" fill={body} />
      <rect x="20" y="70" width="80" height="54" fill={label} />
      <path
        d="M60 78c-7 3-10 8-9 14 6 0 10-4 9-14Zm0 0c7 3 10 8 9 14-6 0-10-4-9-14Z"
        fill={ink}
        opacity="0.85"
      />
      <text
        x="60"
        y="104"
        textAnchor="middle"
        fill={ink}
        style={{ font: '600 10.5px var(--font-tea), Georgia, serif' }}
      >
        {tea.name.split(' ')[0]}
      </text>
      <text
        x="60"
        y="116"
        textAnchor="middle"
        fill={ink}
        opacity="0.7"
        style={{
          font: '500 6.5px var(--font-sans), sans-serif',
          letterSpacing: '0.18em',
        }}
      >
        {tea.kind.toUpperCase()} TEA
      </text>
      <rect
        x="20"
        y="38"
        width="80"
        height="110"
        rx="7"
        fill={`url(#${shade})`}
      />
      <rect
        x="20"
        y="140"
        width="80"
        height="8"
        rx="3"
        fill="#000"
        opacity="0.12"
      />

      <rect x="15" y="22" width="90" height="22" rx="6" fill={lid} />
      <rect
        x="15"
        y="22"
        width="90"
        height="22"
        rx="6"
        fill={`url(#${shade})`}
      />
      <rect
        x="22"
        y="25"
        width="76"
        height="2.5"
        rx="1.25"
        fill="#fff"
        opacity="0.35"
      />
    </svg>
  );
}
