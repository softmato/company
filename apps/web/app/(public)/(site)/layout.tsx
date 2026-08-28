import { PageContainer } from '@/components/public/page-container';

/**
 * Every public page except the home page.
 *
 * A route group, so it adds no path segment: `/about` is still `/about`. It
 * exists purely to give these pages the centred measure that used to live in
 * the public layout, while leaving the home page — a stack of full-bleed
 * bands — unconstrained.
 *
 * Put a new page here unless it is built from `Band`s.
 */
export default function SitePageLayout({ children }: LayoutProps<'/'>) {
  return <PageContainer>{children}</PageContainer>;
}
