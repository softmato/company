/**
 * The primary navigation.
 *
 * Five links, not the site map. The nav is a pill that floats over every
 * section of every page, so each extra item is a permanent cost in covered
 * page and one more tab stop before the content. The long tail — Careers,
 * Team, the seven legal documents — lives in the footer, where it does not
 * follow the reader down the page.
 */
export const NAV_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
  { href: '/team', label: 'Team' },
  { href: '/blog', label: 'Blog' },
] as const;
