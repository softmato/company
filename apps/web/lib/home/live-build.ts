/**
 * The script for the live-preview chapter's build (`live-build.tsx`): a café
 * site assembled on screen at your-project.softmato.com, section by section,
 * with the developer's cursor moving to whatever is being built. Midway the
 * client asks for a change, the engineer answers, and the header and hero
 * change to match before the rest of the page and the footer land.
 * Then the server under it: the orders API, sign-in, the staff guard, the
 * cached menu and the image config, each typed in the editor beside the
 * browser (`live-build-code.ts`) while the browser's network panel records it.
 *
 * The café is the drawing's own placeholder, like `your-project` in the
 * address bar: no client, no claim. Prices on its menu are the drawing's
 * data. Photos are Unsplash (a trusted host in `lib/images/trusted-hosts.ts`).
 */

import type { FileKey } from './live-build-code';

export type Region =
  | 'header'
  | 'hero'
  | 'strip'
  | 'menu'
  | 'story'
  | 'gallery'
  | 'visit'
  | 'footer';

/** The layers of the stack, in the order the build works through them. */
export type Layer = 'ui' | 'api' | 'auth' | 'roles' | 'cache' | 'perf';

/** One row in the browser's network panel. */
export type Request = {
  method: 'GET' | 'POST';
  path: string;
  status: number;
  type: 'document' | 'fetch' | 'avif';
  ms: number;
  note?: string;
  /** The source that answered it; clicking the row opens it. */
  file: FileKey;
};

export type Step = {
  scene: string;
  /** How long it holds (ms) before the next. */
  ms: number;
  /** The region the browser scrolls to. */
  focus: Region;
  /** Regions outlined as being edited. */
  editing?: readonly Region[];
  /** The region the developer's cursor works over; it stays put when absent. */
  cursor?: Region;
  /** Elements (`data-cursor`) it visits instead of the region's own path. */
  targets?: readonly string[];
  /** What the dev-tools badge logs. */
  log?: string;
  /** The file the developer opens and types in this scene. */
  file?: FileKey;
  /** Lines the editor's terminal prints as the scene starts. */
  term?: readonly string[];
  /** A request the browser's network panel records. */
  request?: Request;
  /** The layer worked on from this scene on (the interface until set). */
  layer?: Layer;
};

export const SCENES = [
  {
    scene: 'blank',
    ms: 2600,
    focus: 'header',
    cursor: 'hero',
    file: 'page',
    term: ['$ pnpm dev', '✓ ready on your-project.softmato.com'],
  },
  {
    scene: 'header',
    ms: 2900,
    focus: 'header',
    editing: ['header'],
    cursor: 'header',
    log: 'header.tsx — saved',
    file: 'header',
    term: ['✓ compiled header.tsx in 212ms'],
  },
  {
    scene: 'hero',
    ms: 3000,
    focus: 'header',
    editing: ['hero'],
    cursor: 'hero',
    log: 'hero.tsx — saved',
    file: 'hero',
    term: ['✓ compiled hero.tsx in 168ms'],
  },
  {
    scene: 'heroArt',
    ms: 2000,
    focus: 'header',
    editing: ['hero'],
    cursor: 'hero',
    log: '4 images optimised',
    term: ['○ 4 images → avif, 1100w'],
  },
  {
    scene: 'strip',
    ms: 2800,
    focus: 'strip',
    editing: ['strip'],
    cursor: 'strip',
    log: 'highlights.tsx — saved',
    file: 'highlights',
    term: ['✓ compiled highlights.tsx in 97ms'],
  },
  {
    scene: 'menu',
    ms: 2900,
    focus: 'menu',
    editing: ['menu'],
    cursor: 'menu',
    log: 'menu.tsx — saved',
    file: 'menu',
    term: ['✓ compiled menu.tsx in 143ms'],
  },
  {
    scene: 'devtools',
    ms: 1700,
    focus: 'menu',
    log: 'preview deployed',
    term: ['$ git push', '→ preview deployed'],
  },
  {
    scene: 'story',
    ms: 2800,
    focus: 'story',
    editing: ['story'],
    cursor: 'story',
    log: 'story.tsx — saved',
    file: 'story',
    term: ['✓ compiled story.tsx in 121ms'],
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
    ms: 3600,
    focus: 'header',
    editing: ['header', 'hero'],
    cursor: 'hero',
    log: 'header + hero — updated live',
    file: 'heroUpdate',
    term: ['✓ compiled header.tsx, hero.tsx in 176ms'],
  },
  {
    scene: 'gallery',
    ms: 2800,
    focus: 'gallery',
    editing: ['gallery'],
    cursor: 'gallery',
    log: 'gallery.tsx — saved',
    file: 'gallery',
    term: ['✓ compiled gallery.tsx in 134ms'],
  },
  {
    scene: 'visit',
    ms: 2800,
    focus: 'visit',
    editing: ['visit'],
    cursor: 'visit',
    log: 'visit.tsx — saved',
    file: 'visit',
    term: ['✓ compiled visit.tsx in 102ms'],
  },
  {
    scene: 'footer',
    ms: 2900,
    focus: 'footer',
    editing: ['footer'],
    cursor: 'footer',
    log: 'footer.tsx — saved',
    file: 'footer',
    term: ['✓ compiled footer.tsx in 118ms'],
  },
  {
    scene: 'api',
    ms: 6400,
    focus: 'header',
    cursor: 'hero',
    targets: ['order', 'cta'],
    layer: 'api',
    log: 'POST /api/orders — 201',
    file: 'route',
    term: [
      '$ pnpm test orders',
      '✓ places an order            201',
      '✓ rejects an empty basket    422',
    ],
    request: {
      method: 'POST',
      path: '/api/orders',
      status: 201,
      type: 'fetch',
      ms: 84,
      note: 'order created',
      file: 'route',
    },
  },
  {
    scene: 'auth',
    ms: 7000,
    focus: 'header',
    cursor: 'header',
    targets: ['signin', 'order'],
    layer: 'auth',
    log: 'session started',
    file: 'auth',
    term: [
      '$ pnpm test auth',
      '✓ 401 without a session',
      '✓ cookie is httpOnly + secure',
    ],
    request: {
      method: 'POST',
      path: '/api/sign-in',
      status: 200,
      type: 'fetch',
      ms: 61,
      note: 'Set-Cookie: HttpOnly',
      file: 'auth',
    },
  },
  {
    scene: 'roles',
    ms: 6200,
    focus: 'header',
    cursor: 'header',
    targets: ['nav', 'signin'],
    layer: 'roles',
    log: '/staff — staff only',
    file: 'proxy',
    term: ['$ curl -I /staff/orders', 'HTTP/1.1 403 Forbidden'],
    request: {
      method: 'GET',
      path: '/staff/orders',
      status: 403,
      type: 'document',
      ms: 6,
      note: 'role: customer',
      file: 'proxy',
    },
  },
  {
    scene: 'cache',
    ms: 6400,
    focus: 'header',
    cursor: 'hero',
    targets: ['nav', 'cta'],
    layer: 'cache',
    log: 'menu served from cache',
    file: 'menuCache',
    term: [
      'GET /api/menu 200 in 142ms',
      'GET /api/menu 200 in 3ms   (cache hit)',
    ],
    request: {
      method: 'GET',
      path: '/api/menu',
      status: 200,
      type: 'fetch',
      ms: 3,
      note: 'cache hit',
      file: 'menuCache',
    },
  },
  {
    scene: 'perf',
    ms: 5200,
    focus: 'header',
    cursor: 'hero',
    targets: ['photo', 'cta'],
    layer: 'perf',
    log: 'images → avif',
    file: 'config',
    term: ['$ pnpm build', '✓ hero.jpg 1.2 MB → hero.avif 86 kB'],
    request: {
      method: 'GET',
      path: '/hero.avif',
      status: 200,
      type: 'avif',
      ms: 12,
      note: '86 kB',
      file: 'config',
    },
  },
  {
    scene: 'done',
    ms: 4500,
    focus: 'footer',
    log: 'all changes live',
    term: [
      '$ git commit -m "orders, sign-in, staff, cache"',
      '$ git push',
      '→ preview deployed',
    ],
  },
] as const satisfies readonly Step[];

/** What the network panel already holds when it opens: the page and its menu. */
export const BASE_REQUESTS: readonly Request[] = [
  {
    method: 'GET',
    path: '/',
    status: 200,
    type: 'document',
    ms: 38,
    file: 'page',
  },
  {
    method: 'GET',
    path: '/api/menu',
    status: 200,
    type: 'fetch',
    ms: 142,
    note: 'cache miss',
    file: 'menu',
  },
];

export const LAYERS = [
  {
    id: 'ui',
    label: 'Interface',
    note: 'The pages your customers see, written section by section.',
  },
  {
    id: 'api',
    label: 'Server & API',
    note: 'Orders reach a real server and are checked before they are saved.',
  },
  {
    id: 'auth',
    label: 'Authentication',
    note: 'Customers sign in, and the session cookie stays out of reach of scripts.',
  },
  {
    id: 'roles',
    label: 'Authorization',
    note: 'Staff pages open for staff only; everyone else is turned away.',
  },
  {
    id: 'cache',
    label: 'Caching',
    note: 'The menu is served from cache and refreshes the moment a price changes.',
  },
  {
    id: 'perf',
    label: 'Performance',
    note: 'Photos go out in modern formats, sized for the screen asking.',
  },
] as const satisfies readonly { id: Layer; label: string; note: string }[];

export type Scene = (typeof SCENES)[number]['scene'];

/**
 * The developer's cursor path over each region as it is built, as fractions
 * of the region's box — along the parts in the order they are written.
 */
export const CURSOR_PATH: Record<Region, readonly (readonly [number, number])[]> = {
  header: [
    [0.12, 0.5],
    [0.45, 0.5],
    [0.78, 0.5],
  ],
  hero: [
    [0.2, 0.34],
    [0.22, 0.66],
    [0.68, 0.45],
  ],
  strip: [
    [0.15, 0.5],
    [0.5, 0.5],
    [0.84, 0.5],
  ],
  menu: [
    [0.22, 0.24],
    [0.25, 0.64],
    [0.55, 0.64],
    [0.8, 0.64],
  ],
  story: [
    [0.3, 0.4],
    [0.68, 0.32],
    [0.7, 0.68],
  ],
  gallery: [
    [0.32, 0.18],
    [0.3, 0.55],
    [0.7, 0.5],
  ],
  visit: [
    [0.25, 0.5],
    [0.7, 0.32],
    [0.72, 0.66],
  ],
  footer: [
    [0.15, 0.4],
    [0.5, 0.4],
    [0.82, 0.45],
  ],
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
