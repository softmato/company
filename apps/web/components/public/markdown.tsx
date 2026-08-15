import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { headingId } from '@/lib/cms/headings';

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
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h2 className="headline mt-8 text-xl" {...props} />,
          h2: ({ children: heading, ...props }) => (
            <h2
              id={anchorFor(heading)}
              className="headline mt-10 scroll-mt-24 text-xl"
              {...props}
            >
              {heading}
            </h2>
          ),
          h3: (props) => (
            <h3 className="mt-6 text-base font-medium" {...props} />
          ),
          p: (props) => <p className="mt-4 leading-relaxed" {...props} />,
          ul: (props) => (
            <ul className="mt-4 list-disc space-y-1 pl-5" {...props} />
          ),
          ol: (props) => (
            <ol className="mt-4 list-decimal space-y-1 pl-5" {...props} />
          ),
          a: (props) => (
            <a
              className="text-primary underline underline-offset-2"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="mt-4 border-l-2 border-border pl-4 text-muted-foreground"
              {...props}
            />
          ),
          code: (props) => (
            <code
              className="numeric rounded-sm bg-muted px-1 py-0.5 text-sm"
              {...props}
            />
          ),
          /* Banded rows, per docs/DESIGN.md §4. */
          table: (props) => (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          th: (props) => (
            <th
              className="eyebrow border-b border-border px-3 py-2 text-left text-xs font-normal text-muted-foreground"
              {...props}
            />
          ),
          td: (props) => <td className="px-3 py-2" {...props} />,
          hr: () => <hr className="mt-8 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
