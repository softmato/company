import {
  IconBell,
  IconCamera,
  IconDownload,
  IconFingerprint,
  IconHome,
  IconOffline,
  IconPin,
  IconSearch,
  IconUser,
} from './app-icons';
import { StillFrame } from './still-frame';

/**
 * A phone, drawn, with the things that make an app an app in it. The still for
 * mobile work.
 *
 * Added 2026-08-29 when apps became a service of their own. It is deliberately
 * the *opposite* silhouette to `WebsiteStill` — one tall portrait device in an
 * ink shell against that one's wide pale window — because the pair's only job at
 * panel size is to be told apart instantly. Two drawings of rectangles with bars
 * in them are one drawing shown twice.
 *
 * **Icons, not bars.** The first version filled the screen with grey bars like
 * the website drawing does, and the founder was right that it read as nothing.
 * A bar says "some content"; a fingerprint, a no-signal glyph and a camera say
 * *sign-in, offline and hardware*, which are exactly the three reasons the copy
 * beside it gives for building an app at all. The drawing now argues the same
 * case the text does. Glyphs are in `./app-icons.tsx`.
 *
 * Three things are app-specific rather than page-specific and all three are
 * drawn: the **tab bar** along the bottom, which no website has; the
 * **notification** straddling the top edge, arriving from outside the app; and
 * the **ink shell**, because a phone is an object and a browser window is not.
 *
 * Everything is `aria-hidden` via `StillFrame`: this is a drawing, not a
 * screenshot.
 */
const TILES = [
  { Icon: IconFingerprint, label: 'sign-in' },
  { Icon: IconOffline, label: 'offline' },
  { Icon: IconCamera, label: 'camera' },
  { Icon: IconPin, label: 'location' },
  { Icon: IconBell, label: 'push' },
  { Icon: IconDownload, label: 'stores' },
];

export function AppStill() {
  return (
    <StillFrame>
      <div className="relative mx-auto w-[56%] min-w-[10rem] max-w-[13rem] pt-5">
        {/*
          The handset. Ink, like the device frames in the products band, so it
          reads as an object sitting on the panel rather than as another pale
          card drawn on it.
        */}
        <div className="rounded-[2rem] bg-ink p-[3px] shadow-float">
          <div className="flex aspect-[9/16] flex-col overflow-hidden rounded-[1.85rem] bg-card">
            {/* Status bar, with the pill notch the shell leaves room for. */}
            <div className="relative flex items-center justify-between px-4 pb-2 pt-3">
              <span className="numeric text-[8px] text-muted-foreground">
                9:41
              </span>
              <span className="absolute left-1/2 top-2 h-3 w-10 -translate-x-1/2 rounded-full bg-ink" />
              <span className="h-2 w-3.5 rounded-[3px] border border-foreground/25" />
            </div>

            <div className="min-h-0 flex-1 px-3.5 pb-2">
              <div className="h-2 w-16 rounded-full bg-foreground/70" />

              {/* The six reasons an app is an app, as a home grid. */}
              <div className="mt-3.5 grid grid-cols-3 gap-2">
                {TILES.map(({ Icon, label }, index) => (
                  <div
                    key={label}
                    className={`grid aspect-square place-items-center rounded-xl p-2.5 ${
                      index === 0
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface text-primary'
                    }`}
                  >
                    <Icon />
                  </div>
                ))}
              </div>

              {/*
                Three rows, not two. The screen is a fixed aspect and the tab
                bar is pinned to the bottom of it, so short content leaves a
                white void in the middle of the handset — which reads as a
                half-drawn picture rather than as an app with room to breathe.
              */}
              <div className="mt-3.5 space-y-2.5">
                {['70%', '54%', '62%'].map((width) => (
                  <div key={width} className="flex items-center gap-2">
                    <span className="size-4 flex-none rounded-full bg-surface-strong" />
                    <span
                      className="h-1.5 rounded-full bg-foreground/12"
                      style={{ width }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* The tab bar. The one thing here no website has. */}
            <div className="flex items-center justify-around border-t border-border px-3 pb-2.5 pt-2">
              {[IconHome, IconSearch, IconBell, IconUser].map((Icon, index) => (
                <span
                  key={index}
                  className={`size-4 ${
                    index === 0 ? 'text-primary' : 'text-foreground/25'
                  }`}
                >
                  <Icon />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/*
          A push notification, straddling the top edge of the handset and running
          off it on both sides. Off the edge on purpose: a card contained inside
          the screen reads as part of the app, and the point of this one is that
          it arrives from outside it. Straddling the *edge* rather than sitting
          over the screen also keeps it off the content — an earlier version
          covered the title and the tiles under it, which made the drawing look
          broken rather than layered.
        */}
        <div className="absolute -left-7 -right-7 top-0 rounded-xl border border-border bg-card p-2.5 shadow-float sm:-left-10 sm:-right-10">
          <div className="flex items-center gap-2.5">
            <span className="grid size-6 flex-none place-items-center rounded-lg bg-primary p-1.5 text-primary-foreground">
              <IconBell />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className="block h-1.5 w-14 rounded-full bg-foreground/60" />
              <span className="block h-1.5 w-24 rounded-full bg-foreground/12" />
            </div>
          </div>
        </div>
      </div>
    </StillFrame>
  );
}
