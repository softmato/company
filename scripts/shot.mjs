/**
 * Screenshot a local page with headless Chrome, over the DevTools protocol.
 *
 *   node scripts/shot.mjs <name> [path] [scrollY|full] [width] [height]
 *
 *   node scripts/shot.mjs hero /            0     1440 900
 *   node scripts/shot.mjs mid  /            2400  1440 900
 *   node scripts/shot.mjs all  /            full  1440 900
 *   node scripts/shot.mjs team /team        0     375  812
 *
 * **Why this exists.** The public site's design was built and shipped once
 * without anyone ever looking at it. Every check that ran — contrast ratios,
 * geometry, server-rendered completeness, bundle splitting — passed, and the
 * page still looked wrong, because none of those things are what a page looks
 * like. Looking at it is now one command that depends on nothing but Chrome.
 *
 * It talks CDP directly rather than through Playwright or Puppeteer, and uses
 * Node's own global `WebSocket` rather than the `ws` package. Neither browser
 * driver is in this workspace, and `ws` is only a transitive dependency of
 * @softmato/db — resolvable from that package, not from here. The whole job is
 * four protocol calls, so it needs no dependency at all.
 *
 * `Page.captureScreenshot` with `captureBeyondViewport` is what makes `full`
 * work without stretching the viewport: the layout is measured at the real
 * window size — so `100svh` sections stay one screen tall — and the capture
 * simply extends past it. Passing a giant `--window-size` instead makes every
 * viewport-relative section giant too, which is a picture of a page that does
 * not exist.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME =
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.SHOT_PORT ?? 9222);

const [name, urlPath = '/', scrollArg = '0', width = '1440', height = '900'] =
  process.argv.slice(2);

if (!name) {
  console.error('usage: node scripts/shot.mjs <name> [path] [scrollY|full] [w] [h]');
  process.exit(1);
}

const OUT_DIR =
  process.env.SHOT_DIR ??
  'C:\\Users\\Aanand\\AppData\\Local\\Temp\\claude\\D--company\\945fbd41-9310-46a0-ae29-0925e98b29c9\\scratchpad\\shots';

mkdirSync(OUT_DIR, { recursive: true });

/** Reuse a running Chrome if one is already listening; otherwise start one. */
async function endpoint() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      return (await res.json()).webSocketDebuggerUrl;
    } catch {
      if (attempt === 0) {
        spawn(
          CHROME,
          [
            '--headless=new',
            '--disable-gpu',
            '--hide-scrollbars',
            `--remote-debugging-port=${PORT}`,
            '--user-data-dir=' + OUT_DIR + '\\.chrome-profile',
            'about:blank',
          ],
          { detached: true, stdio: 'ignore' },
        ).unref();
      }
      await sleep(250);
    }
  }
  throw new Error('Chrome did not expose a debugging endpoint');
}

const ws = new WebSocket(await endpoint());
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let nextId = 0;
const pending = new Map();
/** Events we are waiting on, keyed by method name. */
const waiters = new Map();

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);

  if (msg.id !== undefined) {
    pending.get(msg.id)?.(msg.result);
    pending.delete(msg.id);
    return;
  }

  waiters.get(msg.method)?.forEach((resolve) => resolve(msg.params));
  waiters.delete(msg.method);
});

function send(method, params = {}, sessionId) {
  const id = (nextId += 1);
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

function once(method) {
  return new Promise((resolve) => {
    if (!waiters.has(method)) waiters.set(method, []);
    waiters.get(method).push(resolve);
  });
}

/* A fresh tab per run, so state never leaks between screenshots. */
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

const call = (method, params) => send(method, params, sessionId);

await call('Page.enable');
await call('Runtime.enable');
await call('Emulation.setDeviceMetricsOverride', {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 1,
  mobile: Number(width) < 768,
});

const loaded = once('Page.loadEventFired');
await call('Page.navigate', { url: `http://localhost:3000${urlPath}` });
await loaded;

/*
 * Entrance animations are on a ~2s timeline and scroll-triggered reveals need
 * a frame after the scroll to fire. Waiting a fixed 2.5s is cruder than
 * polling for quiescence and completely reliable, which on a screenshot script
 * is the better trade.
 */
await sleep(2500);

const full = scrollArg === 'full';

if (!full && scrollArg !== '0') {
  await call('Runtime.evaluate', {
    expression: `window.scrollTo({ top: ${Number(scrollArg)}, behavior: 'instant' })`,
  });
  await sleep(1200);
}

const { data } = await call('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: full,
  ...(full ? { optimizeForSpeed: false } : {}),
});

const file = `${OUT_DIR}\\${name}.png`;
writeFileSync(file, Buffer.from(data, 'base64'));

await call('Page.close').catch(() => {});
ws.close();

console.log(file);
