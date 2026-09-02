/**
 * The hero's light-forms, as numbers.
 *
 * Two components draw on this circle — the bowl in `hero-arc.tsx` and the
 * smaller lens in `hero-eye.tsx` — and the second one is *defined by* the
 * first: its two ends are the points where it crosses the bowl. Held as two
 * sets of constants that would be the moment anyone tuned `RADIUS`, and the
 * failure is not subtle. The lens is a closed shape whose lower edge is a
 * piece of the bowl itself; a bowl that has moved leaves the fill hanging in
 * space with a crescent of unlit background between the two curves.
 *
 * So the geometry lives here, once, and both components read it.
 */

/*
 * The circle, in viewBox units.
 *
 * **`CENTER_Y` is negative, and that is the whole point.** The equator — the
 * circle's widest point — has to sit *above* the top of the frame. With it
 * inside the frame the two arms reach their widest and then curve back toward
 * each other on the way up, and on a tall viewport the arc visibly closes into
 * an ellipse: a left border, a right border and a bottom, framing the page
 * like a box. The reference never shows that, because its arms are still
 * spreading outward at the moment they leave the top edge — which is what
 * makes the eye read a circle far bigger than the screen rather than a shape
 * with a top to it.
 *
 * At exactly zero the equator sits on the frame's top edge: the arms are still
 * at their widest as they leave, and there is no inward curve anywhere in the
 * visible run. The radius is then half the viewBox width, which puts the arms
 * at roughly 10% and 90% of the section — far enough in to read as a curve
 * passing through. Pushed out to the very edges they stop being arms and
 * become a left and a right border, which with the bowl closing the bottom is
 * what made the page look like a box in a frame.
 */
const CENTER_X = 560;
const CENTER_Y = 0;
const RADIUS = 560;

/*
 * Where the arc leaves the top of the frame: the circle's two crossings of
 * y = 0. Everything above that is off-stage, so the viewBox stops there and
 * the section's `overflow: clip` does the rest.
 */
const EXIT_DX = Math.sqrt(RADIUS ** 2 - CENTER_Y ** 2);

/*
 * Sweep flag 0 — the run goes left exit, down through the bowl, up to the
 * right exit, which is decreasing angle in SVG's y-down space. The large-arc
 * flag is computed rather than written down: with the equator above the frame
 * the visible run is always less than a semicircle, but that stops being true
 * the moment someone drops `CENTER_Y` back below zero, and an arc drawn with
 * the wrong flag silently becomes its own complement.
 */
const SWEEP_DEGREES =
  2 * (90 - (Math.atan2(-CENTER_Y, EXIT_DX) * 180) / Math.PI);
const LARGE_ARC = SWEEP_DEGREES > 180 ? 1 : 0;

export const ARC_PATH = `M ${(CENTER_X - EXIT_DX).toFixed(2)} 0 A ${RADIUS} ${RADIUS} 0 ${LARGE_ARC} 0 ${(
  CENTER_X + EXIT_DX
).toFixed(2)} 0`;

/*
 * The bottom of the bowl: the point the light grows out of.
 *
 * Handed to GSAP as `svgOrigin`, not `transformOrigin`. `transformOrigin` in
 * px is measured from the element's own **bounding box**, and this group's box
 * starts well left of the viewBox because the widest halo stroke overhangs the
 * path by half its width. The result was an origin ~200 units right of the
 * circle's centre, so the arc grew out of a point off to the right and slid
 * into place — the one thing that gives away that it is a scaled object rather
 * than a light opening. `svgOrigin` is in the viewBox's own coordinates, which
 * is what these numbers have always meant.
 */
export const ARC_ORIGIN = `${CENTER_X} ${CENTER_Y + RADIUS}`;

/*
 * Room below the bowl for the halo to fall off in.
 *
 * The viewBox used to end exactly on the arc's lowest point, which cut the
 * wide strokes off mid-falloff and drew a dead-straight horizontal line across
 * the bottom of the glow — the one shape a light source cannot have. Half the
 * widest stroke is enough for it to reach zero on its own.
 */
const BOTTOM_BLEED = 70;

/* Left/top/width/height, cropped to the drawing rather than to round numbers. */
const VIEW_HEIGHT = CENTER_Y + RADIUS + BOTTOM_BLEED;
export const VIEW_BOX = `0 0 ${CENTER_X * 2} ${VIEW_HEIGHT}`;

/*
 * The bleed as a share of the SVG's own height, handed to CSS so it can put
 * the bowl back where it was.
 *
 * The element is anchored by its bottom edge, so growing the box downward
 * lifts the bowl by exactly this much; a `translateY` percentage resolves
 * against the element's own height, which is the one unit that cancels it out
 * at every width. Passing it as a variable rather than writing the percentage
 * into the stylesheet means the two cannot drift when the geometry is tuned.
 */
export const ARC_BLEED = `${((BOTTOM_BLEED / VIEW_HEIGHT) * 100).toFixed(3)}%`;

/*
 * ---------------------------------------------------------------------------
 * The lens: a second, much smaller arc bowing the other way.
 * ---------------------------------------------------------------------------
 *
 * In the reference this is the shape that makes the hero look expensive, and
 * it is easy to mis-describe as "a circle in the middle". It is not a circle.
 * It is one shallow arc curving *upward* whose two ends land exactly on the
 * bowl, so the two curves enclose a pointed almond of light between them —
 * and the wordmark's middle letters sit inside it.
 *
 * Both numbers below are ratios rather than coordinates, because both were
 * measured off the reference as proportions and neither means anything on its
 * own. Sampling the settled frames: the chord spans a little under two-fifths
 * of the bowl's visible width, and the apex rises about a sixth of that chord
 * above it. Set by eye in absolute units the lens either swallowed the whole
 * word or shrank to a detail nobody would see at arm's length.
 */
const LENS_HALF_SPAN = RADIUS * 0.384;
const LENS_RISE = LENS_HALF_SPAN * 2 * 0.17;

/*
 * The crossings — where the lens meets the bowl.
 *
 * Solved against the circle rather than written down, so the ends are *on* the
 * bowl by construction at every radius. This is the whole reason the two
 * shapes share a file: the crossings are the one place the effect can visibly
 * break, and they are also the two brightest points in the finished picture.
 */
const LENS_Y = CENTER_Y + Math.sqrt(RADIUS ** 2 - LENS_HALF_SPAN ** 2);
export const LENS_LEFT_X = CENTER_X - LENS_HALF_SPAN;
export const LENS_RIGHT_X = CENTER_X + LENS_HALF_SPAN;
export const LENS_CROSS_Y = LENS_Y;

/*
 * The lens's own radius, from the chord and the rise. A circular arc through
 * three points is fully determined by them, so this is derived rather than
 * chosen — pick a radius by hand instead and the arc stops passing through the
 * apex you sized it for.
 */
const LENS_RADIUS = (LENS_RISE ** 2 + LENS_HALF_SPAN ** 2) / (2 * LENS_RISE);

const L = (n: number) => n.toFixed(2);

/*
 * Sweep flag 1: left crossing to right crossing the short way *over the top*,
 * which in SVG's y-down space is the positive-angle direction. Flag 0 here
 * draws the same arc bowing downward, which is a second bowl nested inside the
 * first and reads as a printing error.
 */
export const LENS_ARC = `M ${L(LENS_LEFT_X)} ${L(LENS_Y)} A ${L(LENS_RADIUS)} ${L(
  LENS_RADIUS,
)} 0 0 1 ${L(LENS_RIGHT_X)} ${L(LENS_Y)}`;

/*
 * The almond, closed.
 *
 * Out along the lens, then home along the bowl — the return leg is a piece of
 * the *arc's* circle, at the arc's radius, which is what makes the lower edge
 * of this fill sit exactly on the filament rather than near it. Sweep flag 1
 * on the way back because right-to-left through the bottom of the bowl is the
 * reverse of the arc's own left-to-right run.
 */
export const LENS_FILL = `${LENS_ARC} A ${RADIUS} ${RADIUS} 0 0 1 ${L(LENS_LEFT_X)} ${L(
  LENS_Y,
)} Z`;

/*
 * The lens breathes about its own chord, so the two crossings hold still while
 * the apex rises and falls. Scaling about the shape's centre instead drags the
 * ends off the bowl on every frame of the idle — a slow, permanent tearing at
 * the two places the eye is already looking.
 */
export const LENS_ORIGIN = `${CENTER_X} ${L(LENS_Y)}`;
