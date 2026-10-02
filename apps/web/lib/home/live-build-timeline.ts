/**
 * Everything the live-preview chapter shows at a given step, derived from the
 * script alone (`live-build.ts`): the file open in the editor, its tabs, what
 * git marks as changed, the terminal, the network panel, the layer. Nothing
 * accumulates in component state, so jumping to any step — a click on a
 * file, a layer, a part of the site — is only setting the step.
 */
import {
  BASE_REQUESTS,
  SCENES,
  type Layer,
  type Request,
  type Scene,
  type Step,
} from './live-build';
import { FILES, type FileKey } from './live-build-code';

export const STEPS: readonly Step[] = SCENES;
export const LAST = STEPS.length - 1;
export const indexOf = (scene: Scene) =>
  STEPS.findIndex((s) => s.scene === scene);

export type GitStatus = 'untracked' | 'modified';

const side = (layer: Layer) => (layer === 'ui' ? 'ui' : 'server');

/** `lib/menu.ts` → `lib`; `app/api/orders/route.ts` → `app`, `app/api`, … */
const folders = (path: string) =>
  path
    .split('/')
    .slice(0, -1)
    .map((_, i, parts) => parts.slice(0, i + 1).join('/'));

export function timeline(at: number) {
  const past = STEPS.slice(0, at + 1);
  const layer = past.reduce<Layer>((l, s) => s.layer ?? l, 'ui');

  let fileStep = -1;
  let running: Layer = 'ui';
  const status = new Map<string, GitStatus>();
  const tabs: FileKey[] = [];
  const open = new Set<string>();

  past.forEach((s, i) => {
    running = s.layer ?? running;
    if (!s.file) return;
    fileStep = i;
    const { path, existed } = FILES[s.file];
    status.set(path, existed ? 'modified' : 'untracked');
    // One tab per path, holding its latest version, most recent last.
    const had = tabs.findIndex((k) => FILES[k].path === path);
    if (had >= 0) tabs.splice(had, 1);
    tabs.push(s.file);
    // The folders of this half of the build stay open; the other half's close.
    if (side(running) === side(layer))
      folders(path).forEach((f) => open.add(f));
  });

  const term = past.flatMap((s) => s.term ?? []);

  return {
    step: STEPS[at]!,
    layer,
    /** The file the developer has open, and the step that opened it. */
    file: fileStep >= 0 ? STEPS[fileStep]!.file : undefined,
    fileStep,
    status,
    tabs: tabs.slice(-4),
    open: [...open],
    /** The terminal's last lines, and the position of the first in the whole log. */
    term: term.slice(-6),
    termStart: Math.max(0, term.length - 6),
    requests: [
      ...BASE_REQUESTS,
      ...past.flatMap((s): Request[] => (s.request ? [s.request] : [])),
    ],
    log:
      past
        .map((s) => s.log)
        .filter(Boolean)
        .at(-1) ?? 'waiting for changes',
  };
}

export type Timeline = ReturnType<typeof timeline>;

/** How long the developer takes over a file: steady, and done before its scene moves on. */
export const typingTime = (file: FileKey, sceneMs: number) =>
  Math.min(FILES[file].code.length * 9, sceneMs - 700);

/** The step a file is written in, or -1 for files the build only reads. */
export const stepOfFile = (path: string) =>
  STEPS.findIndex((s) => s.file && FILES[s.file].path === path);

/** The file at a path — its first version, where the build writes it twice. */
export const fileAt = (path: string) =>
  (Object.keys(FILES) as FileKey[]).find((k) => FILES[k].path === path);
