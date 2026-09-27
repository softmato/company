'use client';

import { SiteFooter, SiteGallery, SiteVisit } from './live-site-bottom';
import { SiteMenu, SiteStory, SiteStrip } from './live-site-middle';
import { SiteHeader, SiteHero } from './live-site-top';

/**
 * The café site the chapter builds, eight sections deep. Laid out with
 * container queries, so the same markup is the desktop site in the browser
 * and the mobile site in the phone beside it. Which parts are built, and
 * which are being edited, comes from `BuildContext`.
 */
export function LiveBuildSite() {
  return (
    <div className="@container bg-white text-slate-900">
      <SiteHeader />
      <SiteHero />
      <SiteStrip />
      <SiteMenu />
      <SiteStory />
      <SiteGallery />
      <SiteVisit />
      <SiteFooter />
    </div>
  );
}
