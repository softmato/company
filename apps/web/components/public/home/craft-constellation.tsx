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
          className="disc sm:[margin-top:calc(var(--disc-offset)*100%)]"
          style={
            {
              '--disc-offset': disc.offset,
              width: `${disc.scale * 100}%`,
              marginInline: 'auto',
            } as React.CSSProperties
          }
        >
          <p className="headline text-[clamp(1.35rem,2.6vw,2rem)]">
            {disc.label}
          </p>
          <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
            {disc.caption}
          </p>
        </li>
      ))}
    </StaggerIn>
  );
}
