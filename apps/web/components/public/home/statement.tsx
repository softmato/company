import { DrawIn } from '@/components/motion/draw-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { MarkSpark } from '@/components/public/marks';
import { STATEMENT } from '@/lib/home/sentences';

import { CraftConstellation } from './craft-constellation';

/**
 * The first thing under the hero: one sentence, set as large as the page
 * allows, over a scatter of discs.
 *
 * **Why it changed shape.** This used to be three short lines stacked — "We
 * build it. / We run it. / We answer for it." — which is the first reference
 * film's "Fast. Reliable. Safe." beat. It read as a slogan, and a slogan
 * directly under a wordmark reads as a second wordmark. The second film opens
 * the same position with a full sentence whose words alternate between full
 * contrast and washed out, and that is both more to read and less to shout: the
 * quiet words carry the grammar, the loud ones carry the claim.
 *
 * The sentence is one `<h2>`. Three headings for what is one sentence broken
 * for rhythm puts three entries in a screen reader's heading list.
 *
 * No light-form here on purpose. The film earns its big objects by not having
 * one in every scene, and this section sits directly under the hero's arc —
 * a second luminous form eighty pixels below the first reads as the same
 * section continuing.
 */
export function Statement() {
  return (
    <section className="stage px-6 py-28 sm:py-40">
      <div
        className="bloom opacity-70"
        style={
          { '--bloom-x': '82%', '--bloom-y': '18%' } as React.CSSProperties
        }
      />

      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-start gap-4">
          <p className="eyebrow pt-1">How we work</p>
          <DrawIn className="text-primary">
            <MarkSpark className="size-6" />
          </DrawIn>
        </div>

        <ToneReveal
          sentence={STATEMENT}
          className="display mt-8 max-w-[19ch] text-[clamp(2.25rem,7vw,5.25rem)]"
        />

        <p className="mt-10 max-w-[46ch] text-[16px] leading-relaxed text-muted-foreground">
          You talk to the people writing the code, not to an account manager
          relaying messages. Scope, decisions and what changed are written down,
          so a handover is a document rather than a conversation you have to
          remember.
        </p>

        <CraftConstellation />
      </div>
    </section>
  );
}
