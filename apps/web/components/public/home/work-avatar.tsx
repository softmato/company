import { cn } from '@/lib/cn';

/**
 * The two people in "How we work", drawn: the client (a neutral silhouette,
 * because the client is the reader) and the engineer.
 *
 * Illustrations on purpose. The reference uses photographs, and a stock face
 * captioned "Engineer" on our own home page reads as a picture of our team —
 * a team claim (see `lib/home/how-we-work.ts`). A drawn figure reads as a
 * role. Flat shapes on a 64-unit grid; colours are `.avatar--*` tokens in
 * marketing.css so there is no hex in here.
 *
 * Sized by the caller. When rendered 3D avatars arrive, this is the one file
 * that swaps its SVG for an `<Image>`.
 */
export function WorkAvatar({
  who,
  className,
}: {
  who: 'client' | 'engineer';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        `avatar avatar--${who} block aspect-square flex-none overflow-hidden rounded-full ring-2 ring-card`,
        className,
      )}
    >
      <svg viewBox="0 0 64 64" className="size-full">
        <rect width="64" height="64" fill="var(--av-bg)" />
        {who === 'client' ? <Client /> : <Engineer />}
      </svg>
    </span>
  );
}

/*
 * The client is the reader — "You" — so it is a profile silhouette with no
 * hair, face or clothes to give it a gender: whoever is reading can be it.
 * The engineer is a specific person and can be drawn as one.
 */
function Client() {
  return (
    <>
      <circle cx="32" cy="26" r="11" fill="var(--av-figure)" />
      <path
        d="M11 64c1.5-12.5 10-19.5 21-19.5S51.5 51.5 53 64z"
        fill="var(--av-figure)"
      />
    </>
  );
}

function Engineer() {
  return (
    <>
      <path d="M9 64c2-12 10.5-18 23-18s21 6 23 18z" fill="var(--av-shirt)" />
      {/* Hoodie strings. */}
      <path
        d="M28.5 50v6M35.5 50v6"
        stroke="var(--av-bg)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M28 41h8v6.5a4 4 0 0 1-8 0z" fill="var(--av-skin)" />
      <circle cx="32" cy="30" r="10.5" fill="var(--av-skin)" />
      {/* Short hair. */}
      <path
        d="M21.4 29c-.4-7.8 4.4-12.6 10.6-12.6 6.3 0 11 4.6 10.6 12.6-1.3-3.6-4.5-5.6-10.6-5.6s-9.3 2-10.6 5.6z"
        fill="var(--av-hair)"
      />
      {/* Glasses. */}
      <rect
        x="24.2"
        y="28.2"
        width="6.6"
        height="5.2"
        rx="2.2"
        stroke="var(--av-ink)"
        strokeWidth="1.3"
        fill="none"
      />
      <rect
        x="33.2"
        y="28.2"
        width="6.6"
        height="5.2"
        rx="2.2"
        stroke="var(--av-ink)"
        strokeWidth="1.3"
        fill="none"
      />
      <path d="M30.8 30.4h2.4" stroke="var(--av-ink)" strokeWidth="1.3" />
      <path
        d="M29.6 36.4c1.5 1.1 3.3 1.1 4.8 0"
        stroke="var(--av-ink)"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}
