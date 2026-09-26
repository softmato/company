/**
 * The portal's accent colours. Emerald is the brand; the others come from the
 * illustrations, so an icon never introduces a colour the art does not have.
 *
 * Full class strings, not built ones — Tailwind only ships classes it can see.
 */
export type Tone = 'emerald' | 'violet' | 'amber' | 'sky' | 'rose';

export const TONE: Record<
  Tone,
  { chip: string; solid: string; bar: string; soft: string }
> = {
  emerald: {
    chip: 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/20',
    solid: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white',
    bar: 'from-emerald-400 to-teal-400',
    soft: 'bg-emerald-50 border-emerald-200/70',
  },
  violet: {
    chip: 'bg-violet-500/12 text-violet-600 ring-violet-500/20',
    solid: 'bg-gradient-to-br from-violet-400 to-violet-600 text-white',
    bar: 'from-violet-400 to-fuchsia-400',
    soft: 'bg-violet-50 border-violet-200/70',
  },
  amber: {
    chip: 'bg-amber-500/14 text-amber-600 ring-amber-500/25',
    solid: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
    bar: 'from-amber-400 to-orange-400',
    soft: 'bg-amber-50 border-amber-200/70',
  },
  sky: {
    chip: 'bg-sky-500/12 text-sky-600 ring-sky-500/20',
    solid: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white',
    bar: 'from-sky-400 to-blue-500',
    soft: 'bg-sky-50 border-sky-200/70',
  },
  rose: {
    chip: 'bg-rose-500/12 text-rose-600 ring-rose-500/20',
    solid: 'bg-gradient-to-br from-rose-400 to-pink-600 text-white',
    bar: 'from-rose-400 to-pink-400',
    soft: 'bg-rose-50 border-rose-200/70',
  },
};

const ROTATION: Tone[] = ['emerald', 'violet', 'sky', 'amber', 'rose'];

/** A stable colour per id, for things that only need to look different. */
export function toneFor(id: number): Tone {
  return ROTATION[id % ROTATION.length]!;
}
