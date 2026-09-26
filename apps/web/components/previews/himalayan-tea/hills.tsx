/**
 * The hero's landscape: snow peaks behind, a green ridge, and a tea garden in
 * the foreground with its bushes in terraced rows. Drawn, decorative, and
 * anchored to the bottom so it crops gracefully at any width.
 */
const PEAKS = [
  [300, 170],
  [470, 150],
  [660, 120],
  [860, 160],
] as const;

export function Hills() {
  return (
    <svg
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="ht-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe3c4" />
          <stop offset="0.6" stopColor="#f7f1e6" />
        </linearGradient>
        <linearGradient id="ht-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9c7c6" />
          <stop offset="1" stopColor="#dfe4dc" />
        </linearGradient>
      </defs>

      <rect width="1200" height="600" fill="url(#ht-sky)" />
      <circle cx="905" cy="215" r="92" fill="#f2b56b" opacity="0.75" />
      <circle cx="905" cy="215" r="150" fill="#f2b56b" opacity="0.12" />

      <g className="ht-drift" fill="#fff" opacity="0.85">
        <ellipse cx="190" cy="140" rx="70" ry="16" />
        <ellipse cx="240" cy="128" rx="44" ry="14" />
        <ellipse cx="1010" cy="110" rx="60" ry="13" />
      </g>

      <path
        d="M0 330 120 250 190 290 300 170 380 240 470 150 560 230 660 120 760 220 860 160 960 250 1060 190 1200 280V600H0Z"
        fill="url(#ht-far)"
      />
      {PEAKS.map(([x, y]) => (
        <path
          key={x}
          d={`M${x} ${y} l24 22 -12 -3 -12 9 -10 -9 -14 4Z`}
          fill="#fff"
          opacity="0.95"
        />
      ))}

      <path
        d="M0 385C200 335 350 365 500 325S800 305 1000 345 1150 335 1200 352V600H0Z"
        fill="#7d9b73"
      />
      <path
        d="M0 452C250 402 500 432 700 402S1050 392 1200 422V600H0Z"
        fill="#3f6b45"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M-20 ${478 + i * 26}C300 ${440 + i * 26} 600 ${462 + i * 26} 1220 ${446 + i * 26}`}
          fill="none"
          stroke="#2c5233"
          strokeWidth={11 + i * 2}
          strokeDasharray={`1 ${17 + i * 3}`}
          strokeLinecap="round"
        />
      ))}
      <path d="M0 568C400 530 800 566 1200 540V600H0Z" fill="#23432b" />
    </svg>
  );
}
