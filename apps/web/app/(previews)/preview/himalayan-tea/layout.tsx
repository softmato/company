/**
 * himalayan-tea.softmato.com — the sample client's online shop and wholesale
 * ordering page, as the build stands (Phase 8 live preview).
 *
 * `proxy.ts` rewrites that host onto `/preview/himalayan-tea`, frames it only
 * for the portal, and marks it noindex. Softmato's preview bar rides on top.
 */
import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';

import { PreviewBar, type Tech } from '@/components/previews/preview-bar';
import {
  CartDrawer,
  CartProvider,
} from '@/components/previews/himalayan-tea/cart';
import {
  SiteFooter,
  SiteHeader,
} from '@/components/previews/himalayan-tea/site-chrome';
import { portalBaseUrl } from '@/lib/portal/invite';
import { previewStatus } from '@/lib/projects/preview-status';

import './tea.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-tea',
});

export const metadata: Metadata = {
  title: { absolute: 'Himalayan Tea Co.', template: '%s · Himalayan Tea Co.' },
  description: 'Single-estate tea from the hills of eastern Nepal.',
  robots: { index: false, follow: false },
};

/** Progress changes as the founder updates stages; a minute behind is fine. */
export const revalidate = 60;

const TECH: Tech[] = [
  { name: 'Next.js', role: 'Fast, server-rendered pages', colour: '#111827' },
  {
    name: 'Tailwind CSS',
    role: 'The look, on every screen',
    colour: '#38bdf8',
  },
  {
    name: 'PostgreSQL',
    role: 'Teas, stock, orders, price lists',
    colour: '#336791',
  },
  {
    name: 'eSewa · Khalti',
    role: 'Nepali wallets at checkout',
    colour: '#60bb46',
  },
  { name: 'Fonepay QR', role: 'Pay from any bank app', colour: '#c8102e' },
  { name: 'Vercel, Mumbai', role: 'Hosting close to Nepal', colour: '#0f172a' },
];

export default async function HimalayanTeaLayout({
  children,
}: LayoutProps<'/preview/himalayan-tea'>) {
  const status = await previewStatus('himalayan-tea');
  const portal = portalBaseUrl();

  return (
    <div
      className={`${fraunces.variable} ht-root flex min-h-dvh flex-col bg-[var(--ht-cream)] text-[var(--ht-ink)] selection:bg-[var(--ht-amber)]/30`}
    >
      <CartProvider>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CartDrawer />
      </CartProvider>
      <PreviewBar
        status={status}
        tech={TECH}
        portalUrl={
          status ? `${portal}/projects/${status.projectId}` : `${portal}/login`
        }
      />
    </div>
  );
}
