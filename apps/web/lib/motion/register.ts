'use client';

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * GSAP plugin registration, done exactly once.
 *
 * `gsap.registerPlugin` is idempotent, but the import itself is not free and
 * every module that registered on its own pulled the plugins into whichever
 * chunk imported it first. Registering here and importing this module gives
 * the bundler one place to put them.
 *
 * ScrollTrigger, SplitText and DrawSVG are all bundled with the free GSAP
 * package as of 3.13 — none of this needs a Club licence.
 */
let registered = false;

export function registerMotionPlugins() {
  if (registered) return;
  registered = true;

  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin };
