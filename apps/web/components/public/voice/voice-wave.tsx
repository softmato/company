'use client';

import { useEffect, useRef, type RefObject } from 'react';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

const BARS = 40;

/**
 * The waveform in the transcript bar, and the edge light's brightness — both
 * driven by the live microphone.
 *
 * Written straight to `style` from one rAF loop rather than through React
 * state: sixty renders a second for two dozen spans would be the most expensive
 * thing on the page, and `transform` / `opacity` never leave the compositor.
 *
 * The bars are mirrored — the middle ones read the lowest bins, where a voice
 * actually lives, so speech swells from the centre out.
 */
export function VoiceWave({
  analyser,
  glow,
}: {
  analyser: RefObject<AnalyserNode | null>;
  glow: RefObject<HTMLElement | null>;
}) {
  const wave = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bars = Array.from(wave.current?.children ?? []) as HTMLElement[];
    const still = prefersReducedMotion();
    const data = new Uint8Array(64);
    const mid = (BARS - 1) / 2;
    let frame = 0;

    const tick = (now: number) => {
      const node = analyser.current;
      if (node) node.getByteFrequencyData(data);

      let energy = 0;
      bars.forEach((bar, i) => {
        const bin = data[1 + Math.round(Math.abs(i - mid) * 1.3)] ?? 0;
        const level = node ? Math.min(1, (bin / 255) * 1.2) : 0;
        // A slow ripple while nobody is talking, so "listening" looks alive.
        const idle = still ? 0.18 : 0.2 + 0.1 * Math.sin(now / 380 + i * 0.5);
        bar.style.transform = `scaleY(${Math.max(idle, level).toFixed(3)})`;
        energy += level;
      });

      if (glow.current) {
        const loud = Math.min(1, (energy / BARS) * 2.2);
        glow.current.style.opacity = (0.45 + loud * 0.55).toFixed(3);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [analyser, glow]);

  return (
    <div ref={wave} className="voice-wave" aria-hidden>
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
