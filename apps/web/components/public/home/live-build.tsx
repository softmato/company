'use client';

import { Lock, Monitor, Smartphone, Tablet } from 'lucide-react';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent,
} from 'react';

import { preloadCode } from '@/components/animate-ui/primitives/animate/code-block';
import { Drift } from '@/components/motion/drift';
import { useNearViewport } from '@/components/three/use-near-viewport';
import { cn } from '@/lib/cn';
import { CHAT, type Layer, type Region } from '@/lib/home/live-build';
import { ASK_MS, askOf, type Tweak } from '@/lib/home/live-build-asks';
import { FILES, fileName, type FileKey } from '@/lib/home/live-build-code';
import {
  fileAt,
  indexOf,
  LAST,
  STEPS,
  stepOfFile,
  timeline,
  typingTime,
} from '@/lib/home/live-build-timeline';
import { PREVIEW_HOST } from '@/lib/home/live-preview';
import { useMotionEnabled } from '@/lib/motion/use-motion-enabled';

import { LiveBuildAsks } from './live-build-asks';
import { LiveBuildBadge, LiveBuildChat, type Chat } from './live-build-chat';
import { DeveloperCursor, VisitorCursor } from './live-build-cursor';
import { LiveBuildEditor, type Open } from './live-build-editor';
import { LiveBuildLayers } from './live-build-layers';
import { LiveBuildNetwork } from './live-build-network';
import { BuildContext, type BuildState } from './live-build-parts';
import { LiveBuildSite } from './live-build-site';

/** The address bar's size switch; the site reflows by container query. */
const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '38rem' },
  { id: 'phone', label: 'Phone', icon: Smartphone, width: '24rem' },
] as const;

type Device = (typeof DEVICES)[number]['id'];

/** The editor's theme (`live-build-typing.tsx`), for tokenising ahead. */
const THEME = 'vitesse-dark';

/** A client ask in progress: sent, answered, typed, then showing. */
type AskState = { id: Tweak; phase: 0 | 1 | 2 | 3; n: number };

/**
 * Scrolls `view` the least it takes to show `region` whole (or its top, if it
 * is taller than the view), and returns where it will come to rest.
 */
function follow(view: HTMLElement, region: Region, smooth: boolean) {
  const el = view.querySelector<HTMLElement>(`[data-region="${region}"]`);
  const h = view.clientHeight;
  const max = Math.max(0, view.scrollHeight - h);
  if (!el) return view.scrollTop;
  const r = el.getBoundingClientRect();
  const top = r.top - view.getBoundingClientRect().top + view.scrollTop;
  const bottom = top + r.height;

  const pad = 28;
  const cur = view.scrollTop;
  let next = cur;
  if (region === 'header') next = 0;
  else if (top - pad < cur || bottom - top + pad * 2 > h) next = top - pad;
  else if (bottom + pad > cur + h) next = bottom + pad - h;
  next = Math.min(Math.max(next, 0), max);

  view.scrollTo({ top: next, behavior: smooth ? 'smooth' : 'auto' });
  return next;
}

/** The region of the drawn site under a click, if any. */
const regionAt = (e: MouseEvent) =>
  (e.target as HTMLElement).closest<HTMLElement>('[data-region]')?.dataset
    .region as Region | undefined;

/**
 * The live-preview chapter's centrepiece: the developer's editor beside the
 * browser. The café site is written file by file on the left and lands
 * section by section at your-project.softmato.com on the right, the
 * developer's cursor working over each part as it is built; a client
 * message, the engineer's answer, the site changing to match. Then the half
 * no site builder shows: the orders API, sign-in, the staff guard, the cached
 * menu and the image config, typed in the editor while the browser's network
 * panel records each request. A rail over both names the layer.
 *
 * It plays on its own and never stops for a click: a click on a file, a
 * layer or any part of the site jumps the build there and it carries on; a
 * tab or a request opens that source for a scene before the developer takes
 * the editor back. Under it the visitor can play the client — ask for a
 * change and watch it made. Only the rail's pause button holds it still.
 *
 * The script is `lib/home/live-build.ts`; what each step shows is derived in
 * `lib/home/live-build-timeline.ts`. Timers run only while it is on screen;
 * the source is tokenised in idle time as the chapter approaches, so typing
 * does no highlighting. With reduced motion it shows the finished build and
 * still answers clicks.
 */
export function LiveBuild() {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const rest = useRef(0);
  const { ref: near, near: approached } = useNearViewport<HTMLDivElement>();
  const [step, setStep] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);
  const [visible, setVisible] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const [paused, setPaused] = useState(false);
  const [peek, setPeek] = useState<FileKey>();
  const [ask, setAsk] = useState<AskState>();
  const [mine, setMine] = useState<ReadonlySet<Tweak>>(new Set());
  const still = !useMotionEnabled();

  const shown = step ?? (still ? LAST : 0);
  const t = timeline(shown);
  const current = t.step;
  const asked = ask ? askOf(ask.id) : undefined;

  /** On to the next scene, or round again after the last. */
  const advance = () => {
    setPeek(undefined);
    if (shown === LAST) {
      setCycle((c) => c + 1);
      setStep(0);
    } else {
      setStep(shown + 1);
    }
  };
  const onAdvance = useEffectEvent(advance);
  const asks = useRef(0);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = Boolean(entry?.isIntersecting);
        setVisible(on);
        if (!on) setPeek(undefined);
      },
      { threshold: 0.2 },
    );
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (approached)
      preloadCode(
        Object.values(FILES).map(({ code, lang }) => ({ code, lang })),
        THEME,
      );
  }, [approached]);

  // The script. Held while paused or while an ask is being worked on; a
  // file the visitor opened gets the scene's full time again.
  useEffect(() => {
    if (still || !visible || paused || ask) return;
    const id = setTimeout(onAdvance, STEPS[shown]!.ms);
    return () => clearTimeout(id);
  }, [shown, visible, still, paused, ask, peek]);

  // A client ask: sent → answered → typed → showing, then the build moves on.
  useEffect(() => {
    if (!ask) return;
    const { file } = askOf(ask.id);
    const ms = [
      ASK_MS.sent,
      ASK_MS.reply,
      typingTime(file, ASK_MS.typed) + 700,
      ASK_MS.shown,
    ][ask.phase];
    const id = setTimeout(() => {
      if (ask.phase === 2) setMine((m) => new Set(m).add(ask.id));
      if (ask.phase === 3) {
        setAsk(undefined);
        onAdvance();
      } else {
        setAsk({ ...ask, phase: (ask.phase + 1) as AskState['phase'] });
      }
    }, ms);
    return () => clearTimeout(id);
  }, [ask]);

  const focus = asked?.region ?? current.focus;
  useEffect(() => {
    const smooth = !still && shown !== 0;
    const place = () => {
      if (view.current) rest.current = follow(view.current, focus, smooth);
      if (phone.current) follow(phone.current, focus, smooth);
    };
    const raf = requestAnimationFrame(place);
    // Again once a size switch has finished resizing the page.
    const id = setTimeout(place, 560);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(id);
    };
  }, [focus, shown, cycle, still, device]);

  /** Jump the build to a step; it plays on from there. */
  const seek = (i: number) => {
    if (i < 0) return;
    setStep(i);
    setPeek(undefined);
  };

  const openPath = (path: string) => {
    const i = stepOfFile(path);
    if (i >= 0) seek(i);
    else setPeek(fileAt(path));
  };

  const openFile = (file: FileKey) =>
    setPeek(file === t.file ? undefined : file);

  const pickLayer = (layer: Layer) =>
    seek(
      layer === 'ui'
        ? indexOf('header')
        : STEPS.findIndex((s) => s.layer === layer),
    );

  const sendAsk = (id: Tweak) => {
    if (ask) return;
    asks.current += 1;
    setPeek(undefined);
    setAsk({ id, phase: 0, n: asks.current });
  };

  const editing: readonly Region[] =
    ask?.phase === 2 ? [asked!.region] : ask ? [] : (current.editing ?? []);
  const build: BuildState = {
    at: (s) => shown >= indexOf(s),
    editing,
    tweaks: mine,
  };

  // What the scripted update has put on the site, alongside the visitor's.
  const showing = new Set<Tweak>(mine);
  if (build.at('update')) {
    showing.add('dark');
    showing.add('headline');
  }

  const open: Open =
    asked && ask && ask.phase >= 2
      ? {
          file: asked.file,
          writing: !still && ask.phase === 2,
          duration: typingTime(asked.file, ASK_MS.typed),
          instance: `ask-${ask.n}`,
          reading: false,
        }
      : peek
        ? {
            file: peek,
            writing: false,
            duration: 0,
            instance: `read-${peek}`,
            reading: true,
          }
        : {
            file: t.file,
            writing: !still && t.fileStep === shown,
            duration: t.file ? typingTime(t.file, STEPS[t.fileStep]!.ms) : 0,
            instance: `${cycle}-${t.file}`,
            reading: false,
          };

  const chat: Chat = asked
    ? {
        client: asked.message,
        engineer: asked.reply,
        stage: ask!.phase === 0 ? 'asked' : 'answered',
        tasks: [asked.task],
        done: ask!.phase === 3,
        you: true,
      }
    : {
        client: CHAT.client,
        engineer: CHAT.engineer,
        stage:
          build.at('gallery') || !build.at('client')
            ? 'none'
            : build.at('reply')
              ? 'answered'
              : 'asked',
        tasks: ['Header → dark', 'New headline + photo'],
        done: build.at('update'),
        you: false,
      };

  const log =
    asked && ask
      ? ask.phase === 3
        ? `${fileName(asked.file)} — updated live`
        : ask.phase === 2
          ? `editing ${fileName(asked.file)}`
          : 'new message from you'
      : t.log;

  const updating = current.scene === 'update' || ask?.phase === 2;
  const server = t.layer !== 'ui' && current.scene !== 'done';
  const sceneKey = `${cycle}-${shown}-${ask ? `${ask.n}-${ask.phase}` : ''}`;

  return (
    <BuildContext value={build}>
      <div
        ref={root}
        className="relative left-1/2 mt-12 w-[min(94vw,92rem)] -translate-x-1/2"
      >
        <LiveBuildLayers
          layer={t.layer}
          complete={current.scene === 'done'}
          paused={paused}
          onPick={pickLayer}
          onToggle={() => setPaused((p) => !p)}
        />

        <div
          ref={near}
          className="relative mt-8 grid gap-5 lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]"
        >
          {/* Soft gradients alone — a blur filter this size costs a layer the size of the chapter. */}
          <div
            aria-hidden="true"
            className="absolute -inset-x-10 -inset-y-14 -z-10 bg-[radial-gradient(40%_50%_at_20%_30%,rgba(16,185,129,0.16),transparent_70%),radial-gradient(36%_46%_at_85%_75%,rgba(249,115,22,0.12),transparent_70%)]"
          />

          <LiveBuildEditor
            t={t}
            open={open}
            onOpenPath={openPath}
            onOpenFile={openFile}
            // No height of its own on desktop: the browser sets the row.
            className="order-2 h-[32rem] lg:order-1 lg:h-0 lg:min-h-full"
          />

          <div className="relative order-1 lg:order-2">
            <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-[0_50px_100px_-40px_rgba(15,23,42,0.45)] ring-1 ring-slate-200">
              <div className="relative flex items-center gap-3 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-2.5">
                <span aria-hidden="true" className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-[#ff5f57]" />
                  <span className="size-3 rounded-full bg-[#febc2e]" />
                  <span className="size-3 rounded-full bg-[#28c840]" />
                </span>
                <span
                  aria-hidden="true"
                  className="mx-auto flex min-w-0 max-w-md flex-1 items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 font-mono text-[12.5px] shadow-inner ring-1 ring-inset ring-slate-200"
                >
                  <Lock className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">
                    <span className="hidden text-slate-400 sm:inline">
                      https://
                    </span>
                    <span className="font-semibold text-slate-900">
                      {PREVIEW_HOST}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-semibold text-white shadow-md transition-colors 2xl:inline-flex',
                    updating ? 'build-flash bg-amber-500' : 'bg-emerald-600',
                  )}
                >
                  <span className="live-dot size-1.5 rounded-full bg-white" />
                  {updating ? 'Updating live' : 'Live preview'}
                </span>
                <div
                  role="group"
                  aria-label="Preview size"
                  className="hidden items-center gap-0.5 rounded-full bg-slate-100 p-0.5 sm:flex"
                >
                  {DEVICES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      aria-label={`${label} preview`}
                      aria-pressed={device === id}
                      onClick={() => setDevice(id)}
                      className={cn(
                        'grid size-7 cursor-pointer place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                        device === id
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'text-slate-400 hover:text-slate-700',
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <span
                  aria-hidden="true"
                  key={sceneKey}
                  className="build-progress absolute inset-x-0 -bottom-px h-0.5 origin-left bg-gradient-to-r from-emerald-400 to-emerald-600"
                />
              </div>

              <div
                ref={frame}
                className={cn(
                  'relative h-[30rem] transition-colors duration-500 lg:h-[clamp(36rem,76vh,48rem)]',
                  device !== 'desktop' && 'bg-slate-100',
                )}
              >
                <div
                  ref={view}
                  aria-hidden="true"
                  onClick={(e) => {
                    const region = regionAt(e);
                    if (region) seek(indexOf(region));
                  }}
                  className={cn(
                    'build-inspect mx-auto h-full bg-white transition-[max-width,box-shadow] duration-500 ease-out',
                    paused
                      ? 'editor-scroll overflow-y-auto'
                      : 'overflow-hidden',
                    device !== 'desktop' &&
                      'shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_24px_50px_-24px_rgba(15,23,42,0.35)]',
                  )}
                  style={{
                    maxWidth: DEVICES.find((d) => d.id === device)!.width,
                  }}
                >
                  {/* A laptop at 80%: the café's desktop layout fits beside the editor. */}
                  <div className={cn(device === 'desktop' && 'lg:[zoom:0.8]')}>
                    <LiveBuildSite key={cycle} />
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-500',
                    build.at('header') ? 'opacity-0' : 'opacity-100',
                  )}
                >
                  <span className="grid justify-items-center gap-3 text-center">
                    <span className="size-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-500" />
                    <span className="text-[14px] font-semibold text-slate-800">
                      Starting a fresh build…
                    </span>
                    <span className="font-mono text-[11.5px] text-slate-400">
                      your-project · main
                    </span>
                  </span>
                </div>

                <LiveBuildBadge log={log} hidden={server} />
                <LiveBuildNetwork
                  shown={server}
                  rows={t.requests}
                  selected={open.file}
                  onOpen={openFile}
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 hidden md:block"
                >
                  <DeveloperCursor
                    view={view}
                    frame={frame}
                    rest={rest}
                    path={
                      asked
                        ? { region: asked.region }
                        : current.cursor && {
                            region: current.cursor,
                            targets: current.targets,
                          }
                    }
                    sceneKey={sceneKey}
                    low={server}
                    running={visible && !still && !paused}
                  />
                </div>
                <VisitorCursor />
              </div>
            </div>

            <LiveBuildChat
              aria-hidden
              chat={chat}
              className="absolute bottom-6 left-3 z-30 lg:bottom-[12%] lg:-left-10"
            />

            <div
              aria-hidden="true"
              className={cn(
                'absolute -bottom-12 -right-5 z-30 hidden w-[13.5rem] transition-[opacity,translate] duration-700 xl:block',
                server && 'pointer-events-none translate-y-16 opacity-0',
              )}
            >
              <Drift distance={10} duration={6}>
                <div className="overflow-hidden rounded-[2.2rem] border-[7px] border-slate-900 bg-slate-900 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.5)]">
                  <div
                    ref={phone}
                    className="h-[28rem] overflow-hidden rounded-[1.7rem] bg-white"
                  >
                    <div style={{ zoom: 0.5 }}>
                      <LiveBuildSite key={cycle} />
                    </div>
                  </div>
                </div>
              </Drift>
            </div>
          </div>
        </div>

        <LiveBuildAsks
          busy={Boolean(ask)}
          showing={showing}
          mine={mine}
          onAsk={sendAsk}
          onUndo={() => setMine(new Set())}
        />
      </div>
    </BuildContext>
  );
}
