/**
 * The discipline cluster in the services chapter.
 *
 * The chapter's steps come from the CMS and are the long answer — one heading,
 * one paragraph and a link each, read one at a time as the reader scrolls. This
 * is the short answer, above them: four words for the four kinds of work, all
 * visible at once, for the reader who wants to know whether they are in the
 * right place before committing to a scroll.
 *
 * These are capabilities, not claims — no counts, no years, no clients. See
 * `lib/home/statements.ts` for why that line matters and where it is drawn.
 *
 * **Satellites.** Two of the four carry a small chip under the card, naming a
 * thing the discipline actually has to do. They used to overhang the seam
 * between two cards at their own parallax speed; once every card carried an
 * illustration and a title there was no corner left for a drifting chip to
 * cover harmlessly, and they landed on the headline and on neighbours' titles.
 * So each now hangs just below its own card and moves with it.
 *
 * `parallax` is a fraction of viewport height, scrubbed. Neighbouring values
 * are deliberately unequal; if they matched, the cluster would translate as one
 * block and read as a rendering offset rather than as depth.
 */
export interface Satellite {
  label: string;
  caption: string;
  /** Which edge of its card it lines up with — the side facing inward. */
  side: 'left' | 'right';
}

export interface Discipline {
  label: string;
  caption: string;
  parallax: number;
  /** Where the card's arrow goes: the service page that covers it. */
  href: string;
  /**
   * The rendered illustration on the card's right (founder-supplied, trimmed
   * to its ink and saved at 720px in `public/home/disciplines/`). It ripples
   * under the pointer on hover — see `RippleAsset`.
   */
  asset: { src: string; width: number; height: number };
  satellite?: Satellite;
}

export const DISCIPLINES: Discipline[] = [
  {
    label: 'Web',
    caption: 'Sites and web applications',
    parallax: 0.12,
    href: '/services/web-applications',
    asset: { src: '/home/disciplines/web.webp', width: 720, height: 634 },
    satellite: {
      label: 'Payments',
      caption: 'eSewa, Khalti, Fonepay, bank QR',
      side: 'right',
    },
  },
  {
    label: 'Apps',
    caption: 'One codebase, both stores',
    parallax: 0.06,
    href: '/services/mobile-apps',
    asset: { src: '/home/disciplines/apps.webp', width: 382, height: 720 },
  },
  {
    label: 'UI/UX',
    caption: 'Interfaces and the flows through them',
    parallax: 0.14,
    href: '/services',
    asset: { src: '/home/disciplines/uiux.webp', width: 720, height: 665 },
  },
  {
    label: 'Software design',
    caption: 'How the parts fit before any of it is written',
    parallax: 0.08,
    href: '/services/product-engineering',
    asset: {
      src: '/home/disciplines/software-design.webp',
      width: 574,
      height: 720,
    },
    satellite: {
      label: 'Books',
      caption: 'Double-entry, not a spreadsheet',
      side: 'left',
    },
  },
];
