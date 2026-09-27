'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { NAV_LINKS } from '@/components/public/nav-links';

type Box = { left: number; width: number };

const PILL =
  'pointer-events-none absolute inset-y-0 left-0 rounded-full transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/**
 * The desktop nav links over two sliding pills: a faint one that follows the
 * pointer (out of the active tab, and back into it on leave) and the active
 * one, which glides to a tab the moment it is clicked rather than when the
 * next page arrives.
 *
 * The pills need measured positions, so until the first measurement — the
 * server render, and the frame before hydration — the active link paints its
 * own background instead.
 */
export function NavTabs() {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);
  const [seen, setSeen] = useState(pathname);

  // A navigation from anywhere (footer, back button) supersedes the click.
  if (seen !== pathname) {
    setSeen(pathname);
    setClicked(null);
  }

  const indexOf = (path: string) =>
    NAV_LINKS.findIndex(
      ({ href }) => path === href || path.startsWith(`${href}/`),
    );
  const current = indexOf(pathname);
  const active = clicked === null ? current : indexOf(clicked);

  // Covers first layout, web-font swap and the md breakpoint un-hiding it.
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;

    const observer = new ResizeObserver(() =>
      setBoxes(
        links.current.map((a) => ({
          left: a?.offsetLeft ?? 0,
          width: a?.offsetWidth ?? 0,
        })),
      ),
    );
    observer.observe(ul);
    return () => observer.disconnect();
  }, []);

  const measured = (boxes[0]?.width ?? 0) > 0;
  const at = (i: number) => {
    const box = boxes[Math.max(i, 0)];
    return box
      ? { transform: `translateX(${box.left}px)`, width: box.width }
      : undefined;
  };

  return (
    <ul
      ref={list}
      className="relative flex items-center gap-0.5"
      onPointerLeave={() => setHover(null)}
    >
      {measured ? (
        <>
          <span
            aria-hidden="true"
            className={cn(
              PILL,
              'bg-foreground/5',
              hover === null && 'opacity-0',
            )}
            style={at(hover ?? active)}
          />
          <span
            aria-hidden="true"
            className={cn(PILL, 'bg-foreground/8', active < 0 && 'opacity-0')}
            style={at(active)}
          />
        </>
      ) : null}

      {NAV_LINKS.map((link, i) => (
        <li key={link.href}>
          <Link
            ref={(a) => {
              links.current[i] = a;
            }}
            href={link.href}
            aria-current={i === current ? 'page' : undefined}
            onClick={() => setClicked(link.href)}
            onPointerEnter={() => setHover(i)}
            className={cn(
              'relative block rounded-full px-4 py-2 text-[13px] transition-colors duration-300',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              i === active || i === hover
                ? 'text-foreground'
                : 'text-muted-foreground',
              i === active && !measured && 'bg-foreground/8',
            )}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
