import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter, Outfit } from 'next/font/google';
import './globals.css';

/**
 * Three faces, three jobs (docs/DESIGN.md §3).
 *
 * Plex Mono is not interchangeable with the others: it carries every figure in
 * the product, and it is here for `tabular-nums`. See `.numeric` in
 * globals.css.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

/*
 * Outfit, not DM Sans. The display face carries the marketing surface's
 * one-line statements at 80px and up, and the reference's headlines are wide,
 * geometric and open — DM Sans is none of those at that size, and tightening
 * it to compensate closed the counters.
 *
 * Three weights, not the whole variable axis: 300 for `.display`, 500 for
 * `.headline`, 400 for the two places a heading sits inside running text. Add
 * a weight here before using one in CSS, or the browser will synthesise it.
 */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-heading',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Softmato',
  description: 'Softmato Technology Pvt Ltd',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${inter.variable} ${outfit.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
