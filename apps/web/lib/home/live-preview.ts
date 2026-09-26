/**
 * Copy for the home page's live-preview chapter (`preview-section.tsx`).
 *
 * The founder's words, 2026-09-26: the client portal has everything, with a
 * built-in browser view of the site in progress at `project-name.softmato.com`,
 * and the public site should make a point of it. That is the portal's project
 * page as built (`components/portal/browser-frame.tsx`), so nothing here
 * promises more than a client sees on sign-in.
 *
 * `your-project` is the drawing's own placeholder, not a client.
 */
import type { ToneSentence } from './tone';

export const PREVIEW_HEADING: ToneSentence = [
  { text: 'Watch your site' },
  { text: 'take shape,', tone: 'dim' },
  { text: 'live.', mark: 'fill' },
];

export const PREVIEW_LEDE =
  'Every project gets its own address on softmato.com and a place in your client portal. Open it whenever you like — on a laptop, a tablet or your phone — and see the latest build, not a screenshot of it.';

export const PREVIEW_HOST = 'your-project.softmato.com';

export const PORTAL_HOST = 'agency.softmato.com';

export const PREVIEW_POINTS = [
  {
    key: 'preview',
    title: 'Your own preview address',
    body: 'The site in progress at your-project.softmato.com, framed right inside the portal.',
  },
  {
    key: 'devices',
    title: 'Desktop, tablet, phone',
    body: 'Switch the frame between screen sizes, or open it full screen.',
  },
  {
    key: 'stages',
    title: 'Every stage in the open',
    body: 'Where the project stands, what is next, and what is waiting on you.',
  },
  {
    key: 'thread',
    title: 'Files, messages, invoices',
    body: 'One thread with the engineer and one place for every document.',
  },
] as const;
