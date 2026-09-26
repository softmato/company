'use client';

import { useEffect, type RefObject } from 'react';

import { gsap, registerMotionPlugins, ScrollTrigger } from '@/lib/motion/register';

/** Everything the entrance moves, cleared once it has landed. */
const MOVED =
  '[data-widget],[data-card],[data-tile],[data-node],[data-hub],[data-chip],[data-core],[data-item]';

/**
 * The diagram builds itself the way the reference does: the blueprint draws
 * first, then every piece arrives at the end of the line that leads to it —
 * the cards, the three principles, the hub, the right-hand card and its four
 * corners, in the order the current would reach them.
 *
 * Finished-by-default, as everywhere on this surface: the markup is the end
 * state and these are `from` tweens, so a failed bundle or reduced motion
 * shows the whole diagram. Only `opacity`, `transform` and DrawSVG's dash
 * offsets change, and every `transform` is cleared on completion so nothing
 * stays promoted to its own layer.
 *
 * The loops (the current along the wires, the glows, the floating widgets)
 * are CSS, gated on `data-live` (entrance done) and `data-inview` (on
 * screen), so they cost nothing while the section is scrolled past.
 */
export function useBelieveMotion(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    registerMotionPlugins();

    const live = () => el.setAttribute('data-live', '');
    const inview = new IntersectionObserver(([entry]) => {
      el.toggleAttribute('data-inview', entry?.isIntersecting ?? false);
    });

    inview.observe(el);

    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia();

    mm.add(
      {
        wide: '(min-width: 1024px)',
        narrow: '(max-width: 1023px)',
        reduce: '(prefers-reduced-motion: reduce)',
      },
      ({ conditions }) => {
        if (conditions?.reduce) {
          live();
          return;
        }

        if (conditions?.narrow) {
          // Stacked: no wires to follow, so each piece rises in as it is reached.
          const steps = q('[data-step]');

          gsap.set(steps, { autoAlpha: 0, y: 24 });
          ScrollTrigger.batch(steps, {
            start: 'top 88%',
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                stagger: 0.1,
                ease: 'power3.out',
                clearProps: 'transform,opacity,visibility',
              }),
          });
          live();
          return;
        }

        const draw = (beat: string, duration: number, stagger = 0.06) => ({
          targets: q(`[data-draw="${beat}"]`),
          vars: { drawSVG: '0%', duration, stagger, ease: 'power2.inOut' },
        });
        const grid = draw('grid', 1.3, 0.09);
        const wiresIn = draw('in', 0.55);
        const wiresHub = draw('hub', 0.45);
        const wireOut = draw('out', 0.5);
        const drop = draw('drop', 0.3);
        const spokes = draw('spoke', 0.4);
        const land = { autoAlpha: 0, y: 18, scale: 0.97, duration: 0.7 };
        const pop = { autoAlpha: 0, scale: 0.55, duration: 0.5, ease: 'back.out(1.8)' };

        const tl = gsap.timeline({
          defaults: { ease: 'power3.out' },
          scrollTrigger: { trigger: el, start: 'top 70%', once: true },
          onComplete() {
            gsap.set(q(MOVED), { clearProps: 'transform,opacity,visibility' });
            live();
          },
        });

        tl.from(grid.targets, grid.vars)
          .from(q('[data-widget]'), { ...land, stagger: 0.15 }, '-=0.7')
          // The headline, flipped: off goes "looks right", on comes "is right".
          .from(q('[data-knob="looks"]'), { x: 16, duration: 0.45 }, '+=0.1')
          .from(q('[data-fill="looks"]'), { opacity: 1, duration: 0.45 }, '<')
          .from(q('[data-knob="is"]'), { x: 0, duration: 0.45 }, '<0.15')
          .from(q('[data-fill="is"]'), { opacity: 0, duration: 0.45 }, '<')
          .from(q('[data-card="see"]'), land, '-=0.9')
          .from(q('[data-tile]'), { ...pop, stagger: 0.08 }, '-=0.4')
          .from(wiresIn.targets, wiresIn.vars, '-=0.1')
          .from(q('[data-node]'), { ...pop, stagger: 0.08 }, '-=0.35')
          .from(wiresHub.targets, wiresHub.vars, '-=0.15')
          .from(q('[data-hub]'), { ...pop, scale: 0.7 }, '-=0.1')
          .from(wireOut.targets, wireOut.vars, '-=0.1')
          .from(q('[data-chip]'), { autoAlpha: 0, y: -10, duration: 0.45 }, '-=0.3')
          .from(drop.targets, drop.vars, '-=0.15')
          .from(q('[data-card="right"]'), land, '-=0.2')
          .from(q('[data-core]'), pop, '-=0.35')
          .from(spokes.targets, spokes.vars, '-=0.1')
          .from(q('[data-item]'), { ...pop, stagger: 0.08 }, '-=0.3');
      },
    );

    return () => {
      mm.revert();
      inview.disconnect();
      el.removeAttribute('data-live');
    };
  }, [ref]);
}
