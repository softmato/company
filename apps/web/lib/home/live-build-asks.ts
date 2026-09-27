/**
 * What the visitor can ask for in the live-preview chapter, playing the
 * client: each ask is sent as a message, answered by the engineer, typed in
 * the editor, and lands on the café site — where it stays (`Tweak`). The same
 * loop the portal runs with a real client, minus the real client.
 *
 * Only changes the drawn site can actually make: its header, its headline,
 * its brand colour.
 */
import type { Region } from './live-build';
import type { FileKey } from './live-build-code';

export type Tweak = 'dark' | 'headline' | 'green';

export const ASKS = [
  {
    id: 'dark',
    label: 'Make the header dark',
    message: 'Could the header go dark? It feels a bit plain.',
    reply: 'Sure — switching the header to dark now.',
    task: 'Header → dark',
    file: 'headerDark',
    region: 'header',
  },
  {
    id: 'headline',
    label: 'Change the headline',
    message: 'Can the headline say “Fresh roasts, every morning”?',
    reply: 'On it — updating the hero and its photo.',
    task: 'New headline + photo',
    file: 'heroUpdate',
    region: 'hero',
  },
  {
    id: 'green',
    label: 'Green buttons instead',
    message: 'Could the buttons be green instead of orange?',
    reply: 'Good call — changing the brand colour.',
    task: 'Brand colour → green',
    file: 'globals',
    region: 'hero',
  },
] as const satisfies readonly {
  id: Tweak;
  label: string;
  message: string;
  reply: string;
  task: string;
  file: FileKey;
  region: Region;
}[];

export type Ask = (typeof ASKS)[number];

export const askOf = (id: Tweak) => ASKS.find((a) => a.id === id)!;

/**
 * How long an ask spends being sent, answered, typed and shown (ms). Typing
 * gets the same budget as a scripted scene of `typed` ms.
 */
export const ASK_MS = { sent: 1700, reply: 1700, typed: 3800, shown: 2200 };
