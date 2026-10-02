'use client';

import * as React from 'react';
import type { RegexEngine, ThemedToken } from 'shiki';

import { useIsInView, type UseIsInViewOptions } from '@/hooks/use-is-in-view';

/*
 * Adapted from animate-ui's CodeBlock. The original re-ran Shiki over the
 * whole visible code and replaced the block's HTML on every typed character;
 * on a page that is also scrolling and animating, that was the lag. Here a
 * file is tokenised once (ahead of time, with `preloadCode`), and typing only
 * reveals more of the same tokens — finished lines never re-render.
 */

type Themes = { light: string; dark: string };
type Tokens = { lines: ThemedToken[][]; fg: string };

let engine: RegexEngine | undefined;
const cache = new Map<string, Promise<Tokens>>();

/**
 * Tokens for `code`, once per file. Shiki's JavaScript regex engine, so the
 * Oniguruma WASM (the bundle's default) is never fetched.
 */
function tokenize(code: string, lang: string, theme: string) {
  const id = `${lang}\u0000${theme}\u0000${code}`;
  let hit = cache.get(id);
  if (!hit) {
    hit = (async () => {
      const shiki = await import('shiki');
      engine ??= shiki.createJavaScriptRegexEngine();
      const highlighter = await shiki.getSingletonHighlighter({
        engine,
        langs: [lang],
        themes: [theme],
      });
      const { tokens, fg = 'inherit' } = highlighter.codeToTokens(code, {
        lang: lang as never,
        theme,
      });
      return { lines: tokens, fg };
    })();
    cache.set(id, hit);
  }
  return hit;
}

const idle = (fn: () => void) =>
  'requestIdleCallback' in window
    ? requestIdleCallback(fn, { timeout: 2000 })
    : setTimeout(fn, 120);

/**
 * Tokenises files while the browser is idle, one per idle slot, so a block
 * that types them later does no highlighting at all.
 */
function preloadCode(
  files: readonly { code: string; lang: string }[],
  theme: string,
) {
  const next = (i: number) => {
    const file = files[i];
    if (!file) return;
    idle(() => {
      tokenize(file.code, file.lang, theme)
        .catch(() => {})
        .finally(() => next(i + 1));
    });
  };
  next(0);
}

const STYLE = (token: ThemedToken): React.CSSProperties => ({
  color: token.color,
  fontStyle: token.fontStyle && token.fontStyle & 1 ? 'italic' : undefined,
  fontWeight: token.fontStyle && token.fontStyle & 2 ? 600 : undefined,
});

/** One line, cut to its first `upto` characters. Memoised: a finished line is left alone. */
const Line = React.memo(function Line({
  tokens,
  upto,
}: {
  tokens: ThemedToken[];
  upto: number;
}) {
  let left = upto;
  const spans: React.ReactNode[] = [];
  for (const [i, token] of tokens.entries()) {
    if (left <= 0) break;
    const text = token.content.slice(0, left);
    left -= text.length;
    spans.push(
      <span key={i} style={STYLE(token)}>
        {text}
      </span>,
    );
  }
  return <span className="line">{spans}</span>;
});

/** The first `count` characters of the file, as highlighted lines. */
function Reveal({ tokens, count }: { tokens: Tokens; count: number }) {
  const lines: React.ReactNode[] = [];
  let left = count;
  for (const [i, line] of tokens.lines.entries()) {
    const length = line.reduce((n, t) => n + t.content.length, 0);
    lines.push(<Line key={i} tokens={line} upto={Math.min(left, length)} />);
    left -= length;
    if (left <= 0) break;
    left -= 1; // the newline
    lines.push('\n');
  }
  return (
    <pre className="shiki" style={{ color: tokens.fg }}>
      <code>{lines}</code>
    </pre>
  );
}

type CodeBlockProps = React.ComponentProps<'div'> & {
  code: string;
  lang: string;
  theme?: 'light' | 'dark';
  themes?: Themes;
  writing?: boolean;
  duration?: number;
  delay?: number;
  onDone?: () => void;
  onWrite?: (info: { index: number; length: number; done: boolean }) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
} & UseIsInViewOptions;

const DEFAULT_THEMES: Themes = { light: 'github-light', dark: 'github-dark' };

function CodeBlock({
  ref,
  code,
  lang,
  theme = 'light',
  themes = DEFAULT_THEMES,
  writing = false,
  duration = 5000,
  delay = 0,
  onDone,
  onWrite,
  scrollContainerRef,
  inView = false,
  inViewOnce = true,
  inViewMargin = '0px',
  ...props
}: CodeBlockProps) {
  const { ref: localRef, isInView } = useIsInView(
    ref as React.Ref<HTMLDivElement>,
    {
      inView,
      inViewOnce,
      inViewMargin,
    },
  );

  const themeName = themes[theme];
  const [tokens, setTokens] = React.useState<Tokens | null>(null);
  const [count, setCount] = React.useState(writing ? 0 : code.length);
  const [isDone, setIsDone] = React.useState(!writing);

  React.useEffect(() => {
    let live = true;
    tokenize(code, lang, themeName)
      .then((t) => live && setTokens(t))
      .catch((e) =>
        console.error(`Language "${lang}" could not be loaded.`, e),
      );
    return () => {
      live = false;
    };
  }, [code, lang, themeName]);

  React.useEffect(() => {
    if (!writing) {
      setCount(code.length);
      onDone?.();
      onWrite?.({ index: code.length, length: code.length, done: true });
      return;
    }

    if (!code.length || !isInView) return;

    const length = code.length;
    let index = 0;
    // A few characters per tick: ~30 updates a second still reads as typing.
    const perChar = duration / length;
    const step = Math.max(1, Math.round(34 / perChar));
    let intervalId: ReturnType<typeof setInterval>;

    const timeout = setTimeout(() => {
      intervalId = setInterval(() => {
        if (index < length) {
          index = Math.min(index + step, length);
          setCount(index);
          onWrite?.({ index, length, done: false });
        } else {
          clearInterval(intervalId);
          setIsDone(true);
          onDone?.();
          onWrite?.({ index: length, length, done: true });
        }
      }, perChar * step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(intervalId);
    };
  }, [code, duration, delay, isInView, writing, onDone, onWrite]);

  // Follow the typing down the file, once per new line rather than per key.
  const lines = code.slice(0, count).split('\n').length;
  React.useEffect(() => {
    if (!writing || !isInView) return;
    const el =
      scrollContainerRef?.current ??
      (localRef.current?.parentElement as HTMLElement | null);
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [lines, writing, isInView, scrollContainerRef, localRef]);

  return (
    <div
      ref={localRef}
      data-slot="code-block"
      data-writing={writing}
      data-done={isDone}
      {...props}
    >
      {tokens ? (
        <Reveal tokens={tokens} count={count} />
      ) : (
        <pre>
          <code>{code.slice(0, count)}</code>
        </pre>
      )}
    </div>
  );
}

export { CodeBlock, preloadCode, type CodeBlockProps };
