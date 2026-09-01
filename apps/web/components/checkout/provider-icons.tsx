/**
 * Payment provider brand icons.
 *
 * These are simplified, recognisable representations of each provider's
 * brand mark, rendered as inline SVGs so they load instantly without
 * any external image requests. Colours match official brand guidelines.
 */

export function FonepayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#E52127" />
      <path
        d="M10 8h12v3.2H13.6v3.6h7.2v3.2h-7.2V24H10V8z"
        fill="#fff"
      />
    </svg>
  );
}

export function EsewaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#60BB46" />
      <path
        d="M9.5 13.5a6.5 6.5 0 1113 0c0 3.59-6.5 11-6.5 11s-6.5-7.41-6.5-11z"
        fill="#fff"
        fillOpacity="0.3"
      />
      <text
        x="16"
        y="18.5"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="800"
        fontSize="11"
        fill="#fff"
      >
        e
      </text>
    </svg>
  );
}

export function KhaltiIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#5C2D91" />
      <path
        d="M10 8h3.6v6.4L19.2 8H23l-6 7 6.4 9h-4l-4.8-7.2v7.2H10V8z"
        fill="#fff"
      />
    </svg>
  );
}
