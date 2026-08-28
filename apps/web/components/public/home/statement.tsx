import { WordReveal } from '@/components/motion/word-reveal';
import { CRAFT_STATEMENT } from '@/lib/home/statements';

/**
 * Three short lines set as large as the page will allow — the reference's
 * "Fast. Reliable. Safe." beat.
 *
 * Each line is its own `WordReveal`, so the words brighten left to right down
 * the stack as the reader scrolls, rather than all three resolving at once.
 * They are rendered as one `<h2>` with the lines inside it: three headings
 * would put three entries in a screen reader's heading list for what is one
 * sentence broken for rhythm.
 */
export function Statement() {
  return (
    <section className="stage px-6 py-32 sm:py-44">
      <div
        className="bloom"
        style={{ '--bloom-x': '78%', '--bloom-y': '30%' } as React.CSSProperties}
      />
      <div className="grid-floor" />

      <div className="mx-auto w-full max-w-6xl">
        <p className="eyebrow">How we work</p>

        <h2 className="mt-8 grid gap-1">
          {CRAFT_STATEMENT.map((line) => (
            <WordReveal
              key={line}
              as="div"
              className="display text-[clamp(2.5rem,8vw,5.75rem)]"
            >
              {line}
            </WordReveal>
          ))}
        </h2>

        <p className="mt-10 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">
          Small team, direct contact. You talk to the people writing the code,
          not to an account manager relaying messages.
        </p>
      </div>
    </section>
  );
}
