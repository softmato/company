/**
 * The plans on `/plans`: static, advanced, custom. Every plan covers a website
 * and a mobile app; each card lists what the plan means for each, plus any
 * lines that apply to both.
 *
 * **The axis is not size, it is who the software has to answer to:**
 *
 *   1. Does anything change after launch?          No  → static
 *   2. Does someone need to change it without us?  Yes → advanced
 *   3. Does the software enforce rules of its own? Yes → custom
 *
 * Each plan includes everything in the one before it, so a list only names
 * what the plan adds.
 *
 * **No prices, anywhere.** A figure on a public page is an offer, and scope
 * decides the figure. Plain words throughout: the reader is a shop owner, not
 * an engineer. A line may carry one `[label](/path)` link.
 *
 * Placeholder copy, written to become admin-editable CMS fields.
 */
export interface Tier {
  id: 'static' | 'advanced' | 'custom';
  name: string;
  /** Who the plan is for, in one line. */
  tagline: string;
  web: string[];
  app: string[];
  /** Lines that apply to a website and an app alike. */
  both?: string[];
}

export const TIERS: Tier[] = [
  {
    id: 'static',
    name: 'Static',
    tagline: 'For a website or app that stays as it is.',
    web: [
      'Design and build for phones and desktops',
      'Your pages, with your text and images',
      'Contact form that sends to your email',
      'Domain connected, with an SSL certificate',
      'Hosting set up and ready',
      'Search engine basics and visitor analytics',
    ],
    app: [
      'One app for iPhone and Android',
      'Your screens, readable offline',
      'Store listing, icons and screenshots',
      'Submitted to the App Store and Play Store',
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    tagline: 'For a website or app your team updates itself.',
    web: [
      'Admin panel to edit pages, posts and images',
      'Blog or news, with drafts and scheduling',
      'Sign-in, user accounts and roles',
      'Email setup, sitemap and full SEO',
    ],
    app: [
      'Sign-in, profiles and permissions',
      'Data that syncs, even after time offline',
      'Push notifications and deep links',
      'Admin panel to run the app from a desk',
    ],
    both: ['Your own [client portal](/client-portal) to follow the build'],
  },
  {
    id: 'custom',
    name: 'Custom',
    tagline: 'For software built around how your business works.',
    web: [
      'Online payments, invoices and receipts',
      'Built around your own business rules',
      'Connects with the tools you already use',
      'Reports, exports and an activity log',
    ],
    app: [
      'Camera, scanning, maps and location',
      'Works offline first, and syncs by clear rules',
      'In-app payments and subscriptions',
      'One backend shared with your website',
    ],
    both: ['A written scope agreed before the build'],
  },
];
