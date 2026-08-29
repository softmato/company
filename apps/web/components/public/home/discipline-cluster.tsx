import { Parallax } from '@/components/motion/parallax';
import { StaggerIn } from '@/components/motion/stagger-in';
import { DISCIPLINES } from '@/lib/home/disciplines';

/**
 * The four disciplines, above the services steps.
 *
 * Boxes, not the circles used under the opening statement. The two clusters do
 * the same compositional job in the same page and would blur into one another
 * if they shared a shape; the circles are the loose scatter and these are the
 * catalogue, so these get corners and a straighter row.
 *
 * **Where the parallax lives.** Each box has its own `Parallax` and each
 * satellite has a *second* one at a different speed. Putting the satellite
 * inside its host's wrapper would have been fewer elements and would have
 * looked like nothing: two things translating by the same amount do not move
 * relative to each other, and the whole effect is the small box sliding across
 * the seam of the large one. So they are siblings under a `relative` `li`, and
 * they disagree about how fast the page is moving.
 *
 * The satellite is positioned from its host's edge with a negative inset, so it
 * overhangs onto whatever is beside it, and lifted above the row with `z-10`.
 * Below `sm` the grid is two columns and the overhang would land on top of a
 * box's own text rather than in a gutter, so there it tucks under the corner
 * instead of crossing the seam.
 */
export function DisciplineCluster() {
  return (
    <StaggerIn
      as="ul"
      onScroll
      delay={0.1}
      className="mt-14 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4"
    >
      {DISCIPLINES.map((discipline) => (
        /*
         * `z-10` on the *item*, not just on the satellite inside it.
         *
         * The satellite overhangs the box to its right, and that box lives in a
         * later sibling. `z-10` within its own `li` only orders it against its
         * own host — between two positioned siblings with `z-index: auto` the
         * later one in the DOM wins, so the neighbour painted straight over the
         * satellite and clipped its label in half. Raising the whole item is
         * what fixes the comparison that actually matters.
         */
        <li
          key={discipline.label}
          className={discipline.satellite ? 'relative z-10' : 'relative'}
        >
          <Parallax speed={discipline.parallax}>
            <div className="capability">
              <p className="headline text-[clamp(1.05rem,2.1vw,1.5rem)] leading-[1.15]">
                {discipline.label}
              </p>
              <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">
                {discipline.caption}
              </p>
            </div>
          </Parallax>

          {discipline.satellite ? (
            <Parallax
              speed={discipline.satellite.parallax}
              className="capability-sat-anchor absolute z-10 w-[64%]"
              style={
                {
                  '--sat-top': discipline.satellite.top,
                  [discipline.satellite.side === 'right' ? 'right' : 'left']:
                    discipline.satellite.overhang,
                } as React.CSSProperties
              }
            >
              <div className="capability-sat">
                <p className="text-[13px] font-medium leading-none">
                  {discipline.satellite.label}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  {discipline.satellite.caption}
                </p>
              </div>
            </Parallax>
          ) : null}
        </li>
      ))}
    </StaggerIn>
  );
}
