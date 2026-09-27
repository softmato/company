/**
 * `/how-we-work` — how a client project runs, from the first message to the
 * years after launch. The founder's own account of the process, 2026-09-26;
 * nothing here promises more than that account, and nothing states a figure.
 */
import { PORTAL_HOST, PREVIEW_HOST } from '@/lib/home/live-preview';

export interface ProcessStep {
  key: 'talk' | 'access' | 'build' | 'updates' | 'launch' | 'code' | 'care';
  title: string;
  body: string;
  /** Which plans a step applies to, when it is not all of them. */
  plans?: { name: string; included: boolean }[];
  link?: { href: string; label: string };
}

export const PROCESS_LEAD =
  'From the first message to the years after launch: what happens, who holds what, and what you can see along the way.';

export const PROCESS_STEPS: ProcessStep[] = [
  {
    key: 'talk',
    title: 'Tell us what you need',
    body: 'Pick a plan on our services pages, or just send us a message. Either way we talk it through first and help you choose the right scope: static, advanced or custom. We do not publish prices. The scope decides them.',
  },
  {
    key: 'access',
    title: 'Your client portal',
    body: `Advanced and custom projects come with a client portal at ${PORTAL_HOST}. We email you an invitation and you choose your own password. We never send you one.`,
    plans: [
      { name: 'Static', included: false },
      { name: 'Advanced', included: true },
      { name: 'Custom', included: true },
    ],
    link: { href: '/client-portal', label: 'See what the portal looks like' },
  },
  {
    key: 'build',
    title: 'Built in the open',
    body: `While we build, the code lives in Softmato's GitHub and the site runs on our hosting at its own preview address, ${PREVIEW_HOST}. Open it in the portal whenever you like, on a desktop, a tablet or a phone. The stages, the work waiting for your approval, your files and a direct thread with the engineer are all on the same page.`,
  },
  {
    key: 'updates',
    title: 'Every update, as it happens',
    body: 'Each time we put a new version live, we email you to say your project was updated, and your portal shows the new version the moment you open it. There is nothing to chase. Take a look and tell us what you think.',
  },
  {
    key: 'launch',
    title: 'Launch on your own domain',
    body: 'When you are happy with it, we connect your domain. We can register it in your name or in ours, whichever suits you.',
  },
  {
    key: 'code',
    title: 'The code, your way',
    body: 'After launch the repository moves to your own GitHub account, or stays with us. It is your call.',
  },
  {
    key: 'care',
    title: 'Hosting and care after launch',
    body: 'If you want one team to call, we keep hosting the site, renew the domain and maintain the software we built for you.',
  },
];
