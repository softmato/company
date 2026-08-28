/**
 * One clock for the hero's opening.
 *
 * The arc, the wordmark and the copy live in three components that never see
 * each other, and the whole effect of the reference's opening is that they
 * happen in a strict order — light, then name, then line, then buttons. Three
 * separately-tuned delays drift the moment anyone edits one of them, so the
 * order lives here as data instead of being re-guessed in each file.
 *
 * **These numbers are measured, not chosen.** The reference was sampled at
 * 30fps and each frame scored for the arc's extent, its lit area, and the
 * edge energy per lit pixel in the wordmark band — that last one being a
 * direct read on how out of focus the letters are. Everything below comes off
 * those curves. The first guesses, tuned by eye, had the arc taking three and
 * a half times too long and the letters resolving a second too early.
 *
 * Seconds, measured from the moment the hero mounts.
 */
export const HERO = {
  /**
   * The bowl of light finds its shape.
   *
   * A third of a second, which is far quicker than it looks — the reference
   * reads as a slow, stately opening because the *brightness* keeps climbing
   * for another half-second after the geometry has stopped moving, not because
   * the geometry is slow. Animating both on one long curve, which is what this
   * did at 1.15s, makes a fast gesture look sluggish and a bright one look
   * dim.
   */
  arcOpen: { at: 0, duration: 0.34 },

  /**
   * The light comes up.
   *
   * Measured as the arc's lit pixel count, which keeps rising from ~2,250 to
   * ~6,550 between 0.27s and 0.85s — well after the shape settles at 0.34s.
   */
  arcBloom: { at: 0, duration: 0.9 },

  /** A bright head runs out along each arm, ahead of the letters. */
  spark: { at: 0.3, duration: 0.6 },

  /**
   * The letters, in two movements rather than one.
   *
   * They arrive **at full brightness and heavily defocused** — the reference's
   * glyphs are luminous white blobs from the moment they appear, and it is
   * their sharpening, not their fading up, that is the effect. Ramping opacity
   * across the whole entrance, which is what this used to do, makes them dim
   * grey smears at the exact moment they are supposed to look like bubbles of
   * light.
   *
   * `rise` is the arrival; `focus` is the pull. Edge energy per lit pixel
   * bottoms out at 0.87s — peak blur — and does not return to its settled
   * value until 1.9s, so the pull is a full second long and starts only once
   * the bubbles are established.
   */
  letters: {
    rise: { at: 0.2, duration: 0.6 },
    focus: { at: 0.85, duration: 1.05 },
    stagger: 0.06,
  },

  /** The tagline under the name. */
  tagline: 1.8,

  /** Buttons, then the small print under them. */
  copy: 2.1,
} as const;
