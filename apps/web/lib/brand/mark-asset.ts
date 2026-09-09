/**
 * The shape every brand mark shares.
 *
 * A mark is a file in `public/` and a label. It is deliberately not a React
 * component: the same record is read by server components, by client
 * components, and — once a document needs one — by the plain-CSS document
 * renderer, none of which agree on what a component is.
 */
export interface MarkAsset {
  /** Path under `public/`, served as-is. Always starts with `/`. */
  readonly src: string;
  /**
   * The name the mark stands for.
   *
   * Used for `alt` text and as the fallback label when a caller has no better
   * name of its own. Never a legal entity name — it is what the asset is
   * called, not a claim about how the company is registered.
   */
  readonly label: string;
  /**
   * How wide the artwork is relative to its height, or absent when square.
   *
   * Measured from the ink, not the file. The two are different and that is the
   * whole reason this field exists: `fonepay.png` is a 251×251 file whose logo
   * is a 251×125 wordmark floating in transparent bands. Drawn in a square box
   * it renders at half height — an illegible red smear beside the name of the
   * primary payment provider. Eleven of the fifty bank marks have the same
   * problem in one direction or the other.
   *
   * A caller asks for a height; this decides the width. Squashing is never an
   * option — `object-contain` only ever letterboxes, so a wrong ratio costs
   * legibility rather than distorting a brand.
   */
  readonly ratio?: number;
}
