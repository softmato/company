/**
 * A sentence set in two tones.
 *
 * The reference film's headlines alternate full-contrast and washed-out words
 * inside a single sentence — "We believe / in the potential for / technology to
 * reshape the / learning experience." — and that alternation is most of what
 * makes them look like that film. Writing it as data rather than as markup
 * keeps the copy in one place when it becomes an admin-editable field, and
 * stops six components each inventing their own `<span className="tone-dim">`.
 *
 * Segments are joined with a single space when rendered, so no segment carries
 * leading or trailing whitespace of its own.
 */
export interface ToneSegment {
  text: string;
  /** `dim` sets the segment in the quiet tone. Default is full contrast. */
  tone?: 'dim';
}

export type ToneSentence = ToneSegment[];

/** The plain string a tone sentence reads as, for `aria-label` and metadata. */
export function toneText(sentence: ToneSentence): string {
  return sentence.map((segment) => segment.text).join(' ');
}
