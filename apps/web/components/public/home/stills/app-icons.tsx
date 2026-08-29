import { cn } from '@/lib/cn';

/**
 * The glyphs inside the mobile-app still.
 *
 * **These are UI icons, not the hand-drawn marks in `components/public/marks/`.**
 * Those are annotation — a scribbled underline, a circled word — and they are
 * drawn on by `DrawIn`. These are furniture inside a drawing of a phone, and
 * their whole job is that a reader knows what the drawing is a picture of
 * without reading a word. Grey bars in a phone outline say "a rectangle"; a
 * bell, a fingerprint and a no-signal glyph say "notifications, sign-in and
 * offline", which is what the service beside them actually sells.
 *
 * One file rather than nine, for the same reason `marks/index.tsx` is one file:
 * they share a grid, a stroke weight and a cap style, and answering "do these
 * match" should not cost nine opens.
 *
 * Conventions: 24-unit grid, `currentColor`, 1.7 stroke, round caps, no fills.
 * Every one is decorative — the drawing is `aria-hidden` at the frame — so none
 * of them carries a title or a role.
 */
interface IconProps {
  className?: string | undefined;
}

function Glyph({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-full', className)}
    >
      {children}
    </svg>
  );
}

/** Push notification. The reason half of these apps get built. */
export function IconBell(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 4.5-1.5 6-2 6.5h16c-.5-.5-2-2-2-6.5" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </Glyph>
  );
}

/** Works with no signal. */
export function IconOffline(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 3l18 18" />
      <path d="M2.5 8.5a16 16 0 0 1 5-3.1" />
      <path d="M21.5 8.5a16 16 0 0 0-9.7-3.4" />
      <path d="M5.8 12.2a11 11 0 0 1 2.6-1.7" />
      <path d="M18.2 12.2a11 11 0 0 0-3.4-2" />
      <path d="M9.2 15.7a6 6 0 0 1 5-.4" />
      <path d="M12 19.5h.01" />
    </Glyph>
  );
}

/** Sign-in. Biometric rather than a padlock: this is a phone. */
export function IconFingerprint(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 11a2 2 0 0 1 2 2c0 3-.4 5.2-1.2 7" />
      <path d="M8.5 20a14 14 0 0 0 1.5-7 2 2 0 0 1 .6-1.4" />
      <path d="M5.5 17.5A17 17 0 0 0 7 13a5 5 0 0 1 8.2-3.9" />
      <path d="M17 13c0 2.5-.3 4.6-.9 6.3" />
      <path d="M4 9.5a9 9 0 0 1 15.6-.6" />
    </Glyph>
  );
}

/** Camera and scanning — one of the three real reasons to build an app. */
export function IconCamera(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.3l1.3-2h7.8l1.3 2h2.3A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </Glyph>
  );
}

/** Location. The second of the three. */
export function IconPin(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </Glyph>
  );
}

/** Shipped to both stores. */
export function IconDownload(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3.5v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 18.5h15" />
    </Glyph>
  );
}

/* --- Tab bar --------------------------------------------------------- */

export function IconHome(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 10v9.5h12V10" />
    </Glyph>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </Glyph>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="8.5" r="3.7" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </Glyph>
  );
}
