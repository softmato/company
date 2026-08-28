/**
 * The light-forms' colours, as literals.
 *
 * three.js parses a colour once at material construction and cannot read a CSS
 * custom property, so these four cannot be `var(--glow)`. They are the same
 * values as `--glow-core`, `--glow`, `--glow-deep` and `--ink` in globals.css,
 * and they are the one place in the codebase allowed to repeat them.
 *
 * **If a token there changes, change it here too.** There is no build step
 * that will tell you: the page will simply have a green page and a differently
 * green orb on it.
 */
export const FORM_COLORS = {
  core: '#6bf7b8',
  glow: '#12be7e',
  deep: '#05614a',
  ink: '#04120d',
} as const;
