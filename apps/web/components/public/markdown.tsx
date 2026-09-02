import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { headingId } from '@/lib/cms/headings';

/**
 * Drops the mdast node `react-markdown` hands every component.
 *
 * It is not a DOM attribute, so spreading the rest of the props straight onto
 * an element stamps `node="[object Object]"` on it — 86 of them on one legal
 * page. Every component below spreads, so it is stripped here once rather than
 * destructured fifteen times.
 */
function withoutNode<P extends { node?: unknown }>(props: P): Omit<P, 'node'> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

/** The visible text of a rendered node, for building an anchor from it. */
function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

/**
 * Renders a CMS body.
 *
 * `react-markdown` produces React elements, not an HTML string — there is no
 * `dangerouslySetInnerHTML` anywhere in this path, so raw HTML in a body is
 * escaped rather than executed. That is why it was chosen over a
 * markdown-to-string library plus a sanitiser (docs/RULES.md §4).
 *
 * Element styling lives here rather than in a global stylesheet, so the tokens
 * in globals.css stay the single source and page-level prose cannot drift.
 */
export function Markdown({
  children,
  anchors = false,
}: {
  children: string;
  /**
   * Give every `##` an id so a table of contents can link to it. The ids match
   * `extractHeadings`, which walks the same source in the same order.
   */
  anchors?: boolean;
}) {
  const seen = new Set<string>();

  function anchorFor(node: ReactNode): string | undefined {
    if (!anchors) return undefined;

    const base = headingId(nodeText(node));
    let id = base;
    for (let n = 2; seen.has(id); n += 1) id = `${base}-${n}`;
    seen.add(id);

    return id;
  }

  return (
    /*
     * 68ch is the measure a reading column gets (docs/handoff/UI_HANDOFF.md
     * §2). Tables opt out of it below — a comparison table squeezed into a
     * reading measure is unreadable in the other direction.
     */
    <div className="max-w-[68ch] text-[15px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h2 className="headline mt-8 text-xl" {...withoutNode(props)} />
          ),
          h2: ({ children: heading, ...props }) => (
            <h2
              id={anchorFor(heading)}
              className="headline mt-10 scroll-mt-24 text-xl"
              {...withoutNode(props)}
            >
              {heading}
            </h2>
          ),
          h3: (props) => (
            <h3
              className="mt-6 text-base font-medium"
              {...withoutNode(props)}
            />
          ),
          p: (props) => (
            <p className="mt-4 leading-relaxed" {...withoutNode(props)} />
          ),
          ul: (props) => (
            <ul
              className="mt-4 list-disc space-y-1 pl-5"
              {...withoutNode(props)}
            />
          ),
          ol: (props) => (
            <ol
              className="mt-4 list-decimal space-y-1 pl-5"
              {...withoutNode(props)}
            />
          ),
          a: (props) => (
            <a
              className="text-primary underline underline-offset-2"
              {...withoutNode(props)}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="mt-4 border-l-2 border-border pl-4 text-muted-foreground"
              {...withoutNode(props)}
            />
          ),
          /*
           * `code` fires for both a fenced block and an inline span. Only the
           * inline one gets a tinted ground — inside a `pre` the ground is
           * already the block's, and stacking the two draws a box per line.
           * A fenced block is the case carrying a `language-*` class.
           */
          code: ({ className, ...props }) =>
            className?.startsWith('language-') ? (
              <code className={className} {...withoutNode(props)} />
            ) : (
              <code
                className="numeric rounded-sm bg-muted px-1 py-0.5 text-[0.9em]"
                {...withoutNode(props)}
              />
            ),
          /*
           * The banded table, in prose (docs/handoff/UI_HANDOFF.md §5). It
           * breaks the 68ch measure deliberately: a comparison table is read
           * across, not down, and holding it to a reading column wraps every
           * cell.
           */
          table: (props) => (
            <div className="mt-5 w-[min(68ch,100%)] overflow-x-auto sm:w-auto sm:min-w-full">
              <table
                className="w-full border-collapse text-sm"
                {...withoutNode(props)}
              />
            </div>
          ),
          th: (props) => (
            <th
              className="border-b border-border px-3 pb-2 text-left font-mono text-[11.5px] font-normal uppercase tracking-[0.18em] text-muted-foreground"
              {...withoutNode(props)}
            />
          ),
          tr: (props) => (
            <tr className="h-10 even:bg-muted" {...withoutNode(props)} />
          ),
          td: (props) => (
            <td className="px-3 align-middle" {...withoutNode(props)} />
          ),
          pre: (props) => (
            <pre
              className="mt-5 overflow-x-auto rounded-lg bg-surface p-4 font-mono text-[13px] leading-relaxed"
              {...withoutNode(props)}
            />
          ),
          hr: () => <hr className="mt-8 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
