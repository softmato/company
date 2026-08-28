import { StaggerIn } from '@/components/motion/stagger-in';
import { WordReveal } from '@/components/motion/word-reveal';
import { LightForm } from '@/components/three/light-form';
import { PRINCIPLES } from '@/lib/home/statements';

/**
 * The eclipse section — the reference's "Completely anonymous" frame: one
 * enormous form, one line under it, and three quiet cards at the foot.
 *
 * The heading sits *below* the form rather than over it, which is the one
 * place this page departs from the reference's usual arrangement. The eclipse
 * is a dark body on a white page; text laid over it would need to change
 * colour halfway across a word.
 */
export function PrinciplesSection() {
  return (
    <section className="stage px-6 py-28 sm:py-36">
      <div
        className="bloom"
        style={{ '--bloom-x': '50%', '--bloom-y': '30%' } as React.CSSProperties}
      />
      <LightForm kind="eclipse" />

      <div className="mx-auto w-full max-w-6xl">
        <div className="pt-[38vh] text-center sm:pt-[46vh]">
          <p className="eyebrow">What we believe</p>

          <WordReveal
            as="h2"
            className="headline mx-auto mt-7 max-w-[18ch] text-[clamp(2rem,5.5vw,4rem)] leading-[1.05]"
          >
            Software that is right, not software that looks right.
          </WordReveal>
        </div>

        <StaggerIn onScroll className="mt-20 grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <article key={principle.title} className="section-frame p-6">
              <h3 className="headline text-[18px]">{principle.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                {principle.body}
              </p>
            </article>
          ))}
        </StaggerIn>
      </div>
    </section>
  );
}
