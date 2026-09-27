/**
 * The project the live-preview chapter's editor has open (`live-build-editor.tsx`):
 * the café site's source, written file by file beside the browser as the
 * build plays, then the server under it — the orders API, sign-in, the staff
 * guard, the cached menu and the image config.
 *
 * Code the drawing types, not code anyone runs. It is kept honest anyway —
 * real Next.js 16 and Prisma calls — because a developer reading it should
 * find nothing to wince at. ASCII only in the typed files: the editor puts
 * the caret at `col`ch, which holds for a monospace font and nothing wider.
 */
import type { Region } from './live-build';

export type FileKey =
  | 'page'
  | 'layout'
  | 'header'
  | 'headerDark'
  | 'globals'
  | 'hero'
  | 'heroUpdate'
  | 'highlights'
  | 'menu'
  | 'story'
  | 'gallery'
  | 'visit'
  | 'footer'
  | 'route'
  | 'auth'
  | 'proxy'
  | 'menuCache'
  | 'db'
  | 'config'
  | 'pkg';

type SourceFile = {
  path: string;
  lang: 'tsx' | 'ts' | 'json' | 'css';
  code: string;
  /** Already in the repo, so a change shows as modified rather than new. */
  existed?: true;
};

export const FILES: Record<FileKey, SourceFile> = {
  page: {
    path: 'app/page.tsx',
    lang: 'tsx',
    code: `import {
  Footer, Gallery, Header, Hero,
  Highlights, Menu, Story, Visit,
} from '@/components';

export default function Page() {
  return (
    <main>
      <Header />
      <Hero />
      <Highlights />
      <Menu />
      <Story />
      <Gallery />
      <Visit />
      <Footer />
    </main>
  );
}`,
  },
  layout: {
    path: 'app/layout.tsx',
    lang: 'tsx',
    existed: true,
    code: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Your Cafe',
  description: 'Small-batch coffee, roasted daily.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}`,
  },
  header: {
    path: 'components/header.tsx',
    lang: 'tsx',
    code: `import Link from 'next/link';
import { nav } from '@/lib/site';

export function Header() {
  return (
    <header className="sticky top-0 bg-white">
      <Logo />
      <nav className="flex gap-6">
        {nav.map((i) => (
          <Link key={i.href} href={i.href}>
            {i.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}`,
  },
  headerDark: {
    path: 'components/header.tsx',
    lang: 'tsx',
    code: `import Link from 'next/link';
import { nav } from '@/lib/site';

export function Header() {
  return (
    <header className="bg-slate-950 text-white">
      <Logo />
      <nav className="flex gap-6">
        {nav.map((i) => (
          <Link key={i.href} href={i.href}>
            {i.label}
          </Link>
        ))}
      </nav>
      <Link href="/order" className="bg-amber-400">
        Order ahead
      </Link>
    </header>
  );
}`,
  },
  globals: {
    path: 'app/globals.css',
    lang: 'css',
    existed: true,
    code: `@import 'tailwindcss';

@theme {
  --color-brand: oklch(0.64 0.15 160);
  --color-brand-deep: oklch(0.5 0.12 170);
}

.button-primary {
  color: white;
  background: linear-gradient(
    to right,
    var(--color-brand),
    var(--color-brand-deep)
  );
}`,
  },
  hero: {
    path: 'components/hero.tsx',
    lang: 'tsx',
    code: `import Image from 'next/image';
import photo from './hero.jpg';

export function Hero() {
  return (
    <section className="grid md:grid-cols-2">
      <h1>
        Coffee <em>from the hills</em>
      </h1>
      <p>Small-batch beans, roasted in-house.</p>
      <Link href="/menu">See the menu</Link>
      <Image src={photo} alt="" priority />
    </section>
  );
}`,
  },
  heroUpdate: {
    path: 'components/hero.tsx',
    lang: 'tsx',
    code: `import Image from 'next/image';
import photo from './morning.jpg';

export function Hero() {
  return (
    <section className="grid md:grid-cols-2">
      <h1>
        Fresh roasts, <em>every morning</em>
      </h1>
      <p>Roasted at dawn, poured by nine.</p>
      <Link href="/order">Order ahead</Link>
      <Image src={photo} alt="" priority />
    </section>
  );
}`,
  },
  highlights: {
    path: 'components/highlights.tsx',
    lang: 'tsx',
    code: `const perks = [
  { icon: Leaf, label: 'Single origin' },
  { icon: Flame, label: 'Roasted daily' },
  { icon: Milk, label: 'Oat & almond' },
  { icon: Wifi, label: 'Free wifi' },
];

export function Highlights() {
  return (
    <ul className="flex flex-wrap gap-8">
      {perks.map(({ icon: Icon, label }) => (
        <li key={label}>
          <Icon /> {label}
        </li>
      ))}
    </ul>
  );
}`,
  },
  menu: {
    path: 'components/menu.tsx',
    lang: 'tsx',
    code: `import { getMenu } from '@/lib/menu';

export async function Menu() {
  const items = await getMenu();
  return (
    <section id="menu">
      <Tabs tabs={['Coffee', 'Tea', 'Bakes']} />
      <div className="grid gap-4 md:grid-cols-4">
        {items.map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}`,
  },
  story: {
    path: 'components/story.tsx',
    lang: 'tsx',
    code: `const points = [
  'Beans bought straight from the farm',
  'Roasted every morning, never stored',
  'Every cup weighed and timed',
];

export function Story() {
  return (
    <section id="story">
      <h2>Roasted in small batches</h2>
      <ul>
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </section>
  );
}`,
  },
  gallery: {
    path: 'components/gallery.tsx',
    lang: 'tsx',
    code: `import { photos } from './photos';

export function Gallery() {
  return (
    <section id="gallery">
      <h2>
        Come for the coffee, stay for the light
      </h2>
      <div className="columns-2 md:columns-3">
        {photos.map((src) => (
          <Photo key={src} src={src} />
        ))}
      </div>
    </section>
  );
}`,
  },
  visit: {
    path: 'components/visit.tsx',
    lang: 'tsx',
    code: `import { hours } from '@/lib/site';

export function Visit() {
  return (
    <section id="visit">
      <Map />
      <h2>Pull up a chair</h2>
      <dl>
        {hours.map(([day, time]) => (
          <div key={day}>
            <dt>{day}</dt>
            <dd>{time}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}`,
  },
  footer: {
    path: 'components/footer.tsx',
    lang: 'tsx',
    code: `import { subscribe } from '@/lib/actions';

export function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <Logo />
      <p>Small-batch coffee, roasted daily.</p>
      <Links groups={['Visit', 'Cafe']} />
      <form action={subscribe}>
        <input name="email" type="email" required />
        <button>Join</button>
      </form>
    </footer>
  );
}`,
  },
  route: {
    path: 'app/api/orders/route.ts',
    lang: 'ts',
    code: `import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

const Order = z.object({
  items: z.array(z.string()).min(1),
  pickupAt: z.coerce.date(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const input = Order.safeParse(await req.json());
  if (!input.success) {
    return Response.json(input.error.issues, {
      status: 422,
    });
  }
  const order = await db.order.create({
    data: { ...input.data, userId: user.id },
  });
  return Response.json(order, { status: 201 });
}`,
  },
  auth: {
    path: 'lib/auth.ts',
    lang: 'ts',
    code: `import { cookies } from 'next/headers';
import { unauthorized } from 'next/navigation';
import { db } from './db';

export async function getSession() {
  const sid = (await cookies()).get('sid')?.value;
  if (!sid) return null;
  return db.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) unauthorized();
  return session.user;
}

export async function signIn(userId: string) {
  const { id } = await db.session.create({
    data: { userId },
  });
  (await cookies()).set('sid', id, {
    httpOnly: true, secure: true, sameSite: 'lax',
  });
}`,
  },
  proxy: {
    path: 'proxy.ts',
    lang: 'ts',
    code: `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(
      new URL('/sign-in', req.url),
    );
  }
  if (session.user.role !== 'staff') {
    return new NextResponse('Forbidden', {
      status: 403,
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/staff/:path*'],
};`,
  },
  menuCache: {
    path: 'lib/menu.ts',
    lang: 'ts',
    existed: true,
    code: `import {
  cacheLife,
  cacheTag,
  updateTag,
} from 'next/cache';
import { db } from './db';

export async function getMenu() {
  'use cache';
  cacheLife('hours');
  cacheTag('menu');
  return db.menuItem.findMany({
    where: { available: true },
    orderBy: { position: 'asc' },
  });
}

export async function setPrice(
  id: string,
  price: number,
) {
  'use server';
  await db.menuItem.update({
    where: { id },
    data: { price },
  });
  updateTag('menu');
}`,
  },
  db: {
    path: 'lib/db.ts',
    lang: 'ts',
    existed: true,
    code: `import { PrismaClient } from '@prisma/client';

const globalForDb = globalThis as {
  db?: PrismaClient;
};

export const db =
  globalForDb.db ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}`,
  },
  config: {
    path: 'next.config.ts',
    lang: 'ts',
    existed: true,
    code: `import type { NextConfig } from 'next';

const config: NextConfig = {
  cacheComponents: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 768, 1280, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    authInterrupts: true,
  },
};

export default config;`,
  },
  pkg: {
    path: 'package.json',
    lang: 'json',
    existed: true,
    code: `{
  "name": "your-project",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "zod": "^3.25.0"
  }
}`,
  },
};

export type TreeNode = { name: string; path: string; children?: TreeNode[] };

const leaf = (path: string): TreeNode => ({
  name: path.slice(path.lastIndexOf('/') + 1),
  path,
});

/** Folders first, then files, as the editor sorts them. */
export const TREE: TreeNode[] = [
  {
    name: 'app',
    path: 'app',
    children: [
      // One compact row for a folder holding only a folder, as VS Code does.
      {
        name: 'api/orders',
        path: 'app/api/orders',
        children: [leaf('app/api/orders/route.ts')],
      },
      leaf('app/globals.css'),
      leaf('app/layout.tsx'),
      leaf('app/page.tsx'),
    ],
  },
  {
    name: 'components',
    path: 'components',
    children: [
      'footer',
      'gallery',
      'header',
      'hero',
      'highlights',
      'menu',
      'story',
      'visit',
    ].map((name) => leaf(`components/${name}.tsx`)),
  },
  {
    name: 'lib',
    path: 'lib',
    children: [leaf('lib/auth.ts'), leaf('lib/db.ts'), leaf('lib/menu.ts')],
  },
  leaf('next.config.ts'),
  leaf('package.json'),
  leaf('proxy.ts'),
];

/** The component each region of the drawn site is built from. */
export const REGION_FILE: Record<Region, FileKey> = {
  header: 'header',
  hero: 'hero',
  strip: 'highlights',
  menu: 'menu',
  story: 'story',
  gallery: 'gallery',
  visit: 'visit',
  footer: 'footer',
};

export const fileName = (key: FileKey) => leaf(FILES[key].path).name;
