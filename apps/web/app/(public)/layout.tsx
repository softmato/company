import { SmoothScroll } from '@/components/motion/smooth-scroll';
import { SiteFooter } from '@/components/public/site-footer';
import { SiteHeader } from '@/components/public/site-header';

/**
 * The public shell.
 *
 * `<main>` does not constrain its width: the home page is a sequence of
 * full-height stages, and a stage cannot reach the edge of the viewport from
 * inside a centred container. Every other public page wraps its own content in
 * `PageContainer`, which is the measure that used to live here.
 *
 * There is no bottom padding for a floating nav any more — the navigation
 * moved into the header at the top of the viewport, where the reference keeps
 * it, so the footer's last rows are no longer sitting under a fixed pill.
 *
 * The whole product is light, this surface included — the founder's call on
 * 2026-08-28, after a dark build of the marketing pages. The wrapper paints
 * `--background` explicitly anyway so a short page has a ground under it
 * during overscroll rather than whatever `<body>` happens to be.
 */
export default function PublicLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      <SmoothScroll />
      <SiteHeader />
      <main className="w-full flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
