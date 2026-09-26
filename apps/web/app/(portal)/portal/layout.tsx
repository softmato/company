/**
 * agency.softmato.com — the client portal (Phase 8).
 *
 * This outer layout holds no session check: sign-in and invitation pages live
 * under it. The guard is `(signed-in)/layout.tsx`, and every query below that
 * is scoped to the signed-in client at the data layer (docs/RULES.md §6).
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { template: '%s · Softmato client portal', default: 'Client portal' },
  robots: { index: false, follow: false },
};

export default function PortalRootLayout({ children }: LayoutProps<'/portal'>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">{children}</div>
  );
}
