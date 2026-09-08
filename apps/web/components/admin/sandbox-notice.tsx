'use client';

import { useEffect, useRef, useState } from 'react';
import type { CredentialMode } from '@softmato/db';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap } from '@/lib/motion/register';

/**
 * The Sandbox marker that sits under the admin header.
 *
 * A standing marker, not a dismissible notice. While Sandbox is selected every
 * figure under this layout describes integrations in development, and the cost
 * of forgetting that is reading a test payment as revenue.
 *
 * It stays mounted in both modes rather than being rendered conditionally by
 * the layout, which is what makes the entrance possible at all: a strip that
 * is always in the tree and measures 0px in Production has a height to grow
 * from, where one that mounts on the switch is already at full height in the
 * first frame it exists — the jump this is here to remove.
 *
 * Collapsed it is `inert`, so a strip nobody can see is also a strip nobody
 * can tab into or hear read out.
 */
export function AdminSandboxNotice({ mode }: { mode: CredentialMode }) {
  const shell = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLParagraphElement>(null);

  /** Null until the first effect: the first paint is a state, not a change. */
  const previous = useRef<CredentialMode | null>(null);

  const open = mode === 'test';

  /*
   * The height the server rendered, frozen at the first render of this
   * instance. React must not rewrite the inline height when `mode` changes —
   * doing so would snap the strip open a frame before GSAP could animate it,
   * and GSAP would then read the finished height as its starting point.
   *
   * `useState` rather than `useRef`, because this value is read *during*
   * render and a ref read during render is a lint error and a real hazard:
   * refs are not part of the render contract, so a future concurrent render
   * could see a value the committed tree never had. A state initialiser runs
   * exactly once and is legal to read, which is the same guarantee stated
   * where React can enforce it. It is never set again — the setter is dropped
   * on purpose.
   */
  const [openOnLoad] = useState(open);

  useEffect(() => {
    const el = shell.current;
    const inner = body.current;

    if (!el || !inner) return;

    const first = previous.current === null;
    const changed = !first && previous.current !== mode;

    previous.current = mode;

    /*
     * A page loaded straight into Sandbox has not toggled anything — the strip
     * is part of the page as delivered, so it is set, not played. Same for a
     * reader who asked for reduced motion: the request is not to animate, not
     * to animate briefly.
     */
    if (!changed || prefersReducedMotion()) {
      gsap.set(el, { height: open ? 'auto' : 0 });
      gsap.set(inner, { autoAlpha: open ? 1 : 0, y: 0 });
      return;
    }

    const tl = gsap.timeline();

    if (open) {
      tl.fromTo(
        el,
        { height: 0 },
        { height: 'auto', duration: 0.32, ease: 'power2.out' },
      ).fromTo(
        inner,
        { autoAlpha: 0, y: -6 },
        { autoAlpha: 1, y: 0, duration: 0.26, ease: 'power2.out' },
        '-=0.18',
      );
    } else {
      /*
       * Out in the reverse order: the words go before the space does, so the
       * page below rises into a strip that is already empty rather than
       * chasing text on its way out.
       */
      tl.to(inner, {
        autoAlpha: 0,
        y: -6,
        duration: 0.16,
        ease: 'power2.in',
      }).to(el, { height: 0, duration: 0.28, ease: 'power2.inOut' }, '-=0.06');
    }

    return () => {
      tl.kill();
    };
  }, [mode, open]);

  return (
    <div
      ref={shell}
      inert={!open}
      className="overflow-hidden"
      style={openOnLoad ? undefined : { height: 0 }}
    >
      <p
        ref={body}
        className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-800 sm:px-6 dark:text-amber-300"
      >
        Showing <strong>Sandbox</strong> activity — integrations in development,
        transacted against the providers&rsquo; test gateways. None of it is
        money.
      </p>
    </div>
  );
}
