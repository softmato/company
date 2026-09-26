import { cn } from '@/lib/cn';

/**
 * Line glyphs for what a settled payment produces. Shared by the beam diagram
 * and the activity feed so a receipt is drawn the same way in both. 24-unit
 * grid, `currentColor`, round caps.
 */
const PATHS = {
  order: (
    <>
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  notify: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  webhook: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M10 13l-2 2 2 2m4-4 2 2-2 2" />
    </>
  ),
  refund: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" />
    </>
  ),
  mobile: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
} as const;

export type PaymentGlyphName = keyof typeof PATHS;

export function PaymentGlyph({
  name,
  className,
}: {
  name: PaymentGlyphName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-5', className)}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
