import { Drift } from '@/components/motion/drift';
import { Parallax } from '@/components/motion/parallax';
import { StaggerIn } from '@/components/motion/stagger-in';
import { CRAFT_DISCS } from '@/lib/home/craft';

/**
 * The scatter of soft discs under the opening statement.
 *
 * The reference film rings its first heading with five circles at five
 * different heights, and the arrangement does two jobs at once: it fills the
 * lower half of a screen whose top half is one sentence, and it stops the eye
 * reading left to right, which is what a row would have made it do.
 *
 * Ours carry craft names, not figures. See `lib/home/craft.ts` for why.
 *
 * The offsets are `margin-top` in units of the disc's own width, so the scatter
 * scales with the discs rather than being four hard-coded pixel values that
 * collapse into a line on a laptop. Below `sm` the offsets are dropped and the
 * discs pair up — a scatter needs room to read as one, and four circles at four
 * heights on a phone is a column with a wobble in it.
 *
 * Four nested elements per disc, and each owns exactly one transform. The `li`
 * holds the grid position, the offset, and the entrance stagger; `Parallax`
 * owns the scroll-linked climb; `Drift` owns the endless float; `.disc` is the
 * circle and keeps its own transform free for the hover lift. Collapsing any
 * two of these puts two tweens on one element's `transform` and the last one to
 * run wins — which in practice means the parallax quietly cancels the float.
 *
 * That nesting is the whole reason the section reads as depth rather than as
 * decoration. The scatter is four circles at four heights; the parallax makes
 * those heights change as you pass, which is the only cue that says the circles
 * are at four *distances*. The float on top of it is what stops the arrangement
 * freezing solid whenever the reader stops scrolling.
 */
export function CraftConstellation() {
  return (
    <StaggerIn
      as="ul"
      onScroll
      delay={0.15}
      className="mt-16 grid grid-cols-2 gap-x-4 gap-y-8 sm:mt-24 sm:grid-cols-4 sm:gap-x-6"
    >
      {CRAFT_DISCS.map((disc) => (
        <li
          key={disc.label}
          className="sm:[margin-top:calc(var(--disc-offset)*100%)]"
          style={
            {
              '--disc-offset': disc.offset,
              width: `${disc.scale * 100}%`,
              marginInline: 'auto',
            } as React.CSSProperties
          }
        >
          <Parallax speed={disc.parallax}>
            <Drift distance={disc.drift} duration={disc.period}>
              <div className="disc">
                <p className="headline text-[clamp(1.3rem,2.5vw,1.95rem)]">
                  {disc.label}
                </p>
                <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                  {disc.caption}
                </p>
              </div>
            </Drift>
          </Parallax>
        </li>
      ))}
    </StaggerIn>
  );
}
