/**
 * The script for the live-preview chapter's build (`live-build.tsx`): a café
 * site assembled on screen at your-project.softmato.com, section by section,
 * with the developer's cursor moving to whatever is being built. Midway the
 * client asks for a change, the engineer answers, and the header and hero
 * change to match before the rest of the page and the footer land.
 *
 * The café is the drawing's own placeholder, like `your-project` in the
 * address bar: no client, no claim. Prices on its menu are the drawing's
 * data. Photos are Unsplash (a trusted host in `lib/images/trusted-hosts.ts`).
 */

export type Region =
  | 'header'
  | 'hero'
  | 'strip'
  | 'menu'
  | 'story'
  | 'gallery'
  | 'visit'
  | 'footer';

type Step = {
  scene: string;
  /** How long it holds (ms) before the next. */
  ms: number;
  /** The region the browser scrolls to. */
  focus: Region;
  /** Regions outlined as being edited. */
  editing?: Region[];
  /** Where the developer's cursor goes; it stays put when absent. */
  cursor?: Region;
  /** What the dev-tools badge logs. */
  log?: string;
};

export const SCENES = [
  { scene: 'blank', ms: 1100, focus: 'header', cursor: 'hero' },
  {
    scene: 'header',
    ms: 1700,
    focus: 'header',
    editing: ['header'],
    cursor: 'header',
    log: 'header.tsx — saved',
  },
  {
    scene: 'hero',
    ms: 2400,
    focus: 'header',
    editing: ['hero'],
    cursor: 'hero',
    log: 'hero.tsx — saved',
  },
  {
    scene: 'heroArt',
    ms: 2300,
    focus: 'header',
    editing: ['hero'],
    cursor: 'hero',
    log: '4 images optimised',
  },
  {
    scene: 'strip',
    ms: 1500,
    focus: 'strip',
    editing: ['strip'],
    cursor: 'strip',
    log: 'highlights.tsx — saved',
  },
  {
    scene: 'menu',
    ms: 2500,
    focus: 'menu',
    editing: ['menu'],
    cursor: 'menu',
    log: 'menu.tsx — saved',
  },
  {
    scene: 'devtools',
    ms: 1600,
    focus: 'menu',
    log: 'preview deployed',
  },
  {
    scene: 'story',
    ms: 2400,
    focus: 'story',
    editing: ['story'],
    cursor: 'story',
    log: 'story.tsx — saved',
  },
  {
    scene: 'client',
    ms: 4000,
    focus: 'story',
    log: 'new message from client',
  },
  { scene: 'reply', ms: 2700, focus: 'story', log: 'engineer replied' },
  { scene: 'scrollTop', ms: 1300, focus: 'header', cursor: 'header' },
  {
    scene: 'update',
    ms: 3400,
    focus: 'header',
    editing: ['header', 'hero'],
    cursor: 'hero',
    log: 'header + hero — updated live',
  },
  {
    scene: 'gallery',
    ms: 2300,
    focus: 'gallery',
    editing: ['gallery'],
    cursor: 'gallery',
    log: 'gallery.tsx — saved',
  },
  {
    scene: 'visit',
    ms: 2100,
    focus: 'visit',
    editing: ['visit'],
    cursor: 'visit',
    log: 'visit.tsx — saved',
  },
  {
    scene: 'footer',
    ms: 2300,
    focus: 'footer',
    editing: ['footer'],
    cursor: 'footer',
    log: 'footer.tsx — saved',
  },
  { scene: 'done', ms: 4000, focus: 'footer', log: 'all changes live' },
] as const satisfies readonly Step[];

export type Scene = (typeof SCENES)[number]['scene'];

/** Where on a region the cursor lands, as fractions of its box. */
export const CURSOR_ANCHOR: Record<Region, [number, number]> = {
  header: [0.72, 0.5],
  hero: [0.3, 0.3],
  strip: [0.55, 0.5],
  menu: [0.42, 0.55],
  story: [0.68, 0.35],
  gallery: [0.36, 0.45],
  visit: [0.28, 0.5],
  footer: [0.55, 0.4],
};

const unsplash = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const PHOTO = {
  heroBefore: unsplash('1501339847302-ac426a4a7cbb', 1100),
  heroAfter: unsplash('1514432324607-a09d9b4aefdd', 1100),
  roast: unsplash('1442512595331-e89e73853f31', 300),
  pastry: unsplash('1555507036-ab1f4038808a', 300),
  interior: unsplash('1554118811-1e0d58224f24'),
  counter: unsplash('1445116572660-236099ec97a0'),
} as const;

export const SITE = {
  brand: 'Your Café',
  nav: ['Menu', 'Our story', 'Gallery', 'Visit'],
  before: {
    lead: 'Coffee',
    rest: 'from the hills',
    body: 'Small-batch beans, roasted in-house and poured by people who care about the cup.',
    cta: 'See the menu',
  },
  after: {
    lead: 'Fresh roasts,',
    rest: 'every morning',
    body: 'Roasted at dawn, poured by nine. Order ahead and skip the queue.',
    cta: 'Order ahead',
  },
  perks: ['Open 7am – 7pm', 'Free wifi', 'Oat milk on tap'],
  strip: [
    { icon: 'leaf', label: 'Single origin' },
    { icon: 'flame', label: 'Roasted daily' },
    { icon: 'milk', label: 'Oat & almond' },
    { icon: 'wifi', label: 'Free wifi' },
    { icon: 'bike', label: 'Delivery' },
  ],
  menuTabs: ['Coffee', 'Tea', 'Bakes'],
  menu: [
    {
      name: 'Espresso',
      note: 'Double shot',
      price: 'NPR 180',
      image: unsplash('1509042239860-f550ce710b93', 500),
    },
    {
      name: 'Flat white',
      note: 'Silky, strong',
      price: 'NPR 260',
      image: unsplash('1461023058943-07fcbe16d735', 500),
    },
    {
      name: 'Pour over',
      note: 'Brewed to order',
      price: 'NPR 320',
      image: unsplash('1495474472287-4d71bcdd2085', 500),
    },
    {
      name: 'Croissant',
      note: 'Baked at six',
      price: 'NPR 220',
      image: unsplash('1555507036-ab1f4038808a', 500),
    },
  ],
  story: {
    eyebrow: 'Our story',
    title: 'Roasted in small batches, a few streets away',
    points: [
      'Beans bought straight from the farm',
      'Roasted every morning, never stored',
      'Every cup weighed and timed',
    ],
  },
  gallery: [
    unsplash('1517248135467-4c7edcad34c4', 700),
    unsplash('1541167760496-1628856ab772', 500),
    unsplash('1509440159596-0249088772ff', 500),
    unsplash('1453614512568-c4024d13c247', 500),
    unsplash('1521017432531-fbd92d768814', 700),
  ],
  hours: [
    ['Mon – Fri', '7am – 7pm'],
    ['Saturday', '8am – 8pm'],
    ['Sunday', '8am – 5pm'],
  ],
} as const;

export const CHAT = {
  client:
    'Love it! Can the header go dark, and the headline say “Fresh roasts, every morning”?',
  engineer: 'On it — updating the header and hero now.',
} as const;
