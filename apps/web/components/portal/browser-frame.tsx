'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Lock,
  Maximize2,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
  type LucideIcon,
} from 'lucide-react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/cn';

const DEVICES: {
  id: string;
  label: string;
  icon: LucideIcon;
  width: string;
  height: string;
}[] = [
  {
    id: 'desktop',
    label: 'Desktop',
    icon: Monitor,
    width: '100%',
    height: 'min(72vh, 820px)',
  },
  {
    id: 'tablet',
    label: 'Tablet',
    icon: Tablet,
    width: 'min(100%, 820px)',
    height: 'min(78vh, 1000px)',
  },
  {
    id: 'mobile',
    label: 'Phone',
    icon: Smartphone,
    width: 'min(100%, 390px)',
    height: 'min(78vh, 780px)',
  },
];

function BarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

/**
 * The client's site in progress, inside a browser window: address bar, reload,
 * desktop / tablet / phone widths, full screen and "open in a new tab".
 *
 * The page is another origin (`<slug>.softmato.com`), so the frame cannot see
 * where inside it the client has navigated — the address bar shows the host,
 * which is the part worth recognising.
 */
export function BrowserFrame({
  url,
  host,
  title,
}: {
  url: string;
  host: string;
  title: string;
}) {
  const [device, setDevice] = useState(DEVICES[0]!);
  const [loaded, setLoaded] = useState(false);
  const [round, setRound] = useState(0);
  const shell = useRef<HTMLDivElement>(null);

  // A site that refuses to be framed, or is not up yet, may never fire `load`;
  // the browser's own message underneath says more than a spinner would.
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 8000);
    return () => clearTimeout(timer);
  }, [round]);

  function reload() {
    setLoaded(false);
    setRound((n) => n + 1);
  }

  return (
    <div
      ref={shell}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-float [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:rounded-none"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-2">
        <span aria-hidden="true" className="hidden gap-1.5 pr-1 sm:flex">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>

        <BarButton label="Reload" onClick={reload}>
          <RotateCw />
        </BarButton>

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-inner ring-1 ring-inset ring-slate-200">
          <Lock
            className="size-3.5 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span className="truncate font-mono text-[13px]">
            <span className="hidden text-slate-400 sm:inline">https://</span>
            <span className="font-semibold text-slate-900">{host}</span>
          </span>
        </div>

        <div
          role="group"
          aria-label="Screen size"
          className="hidden items-center rounded-full bg-slate-200/70 p-0.5 md:flex"
        >
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={device.id === d.id}
              title={d.label}
              onClick={() => setDevice(d)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                device.id === d.id
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              <d.icon className="size-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">{d.label}</span>
            </button>
          ))}
        </div>

        <BarButton
          label="Full screen"
          onClick={() => void shell.current?.requestFullscreen?.()}
        >
          <Maximize2 />
        </BarButton>
        <a
          href={url}
          target="_blank"
          rel="noopener"
          aria-label="Open in a new tab"
          title="Open in a new tab"
          className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div
        className="relative flex flex-1 justify-center bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.10),transparent_45%),radial-gradient(circle_at_90%_100%,rgba(139,92,246,0.10),transparent_45%)] p-0 transition-[padding] data-[framed=true]:p-4 sm:data-[framed=true]:p-6"
        data-framed={device.id !== 'desktop'}
      >
        <iframe
          key={round}
          src={url}
          title={title}
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ width: device.width, height: device.height }}
          className={cn(
            'block bg-white transition-[width] duration-300 ease-out [:fullscreen_&]:!h-full',
            device.id !== 'desktop' &&
              'rounded-[20px] shadow-xl ring-8 ring-slate-900',
          )}
        />

        {loaded ? null : (
          <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-card ring-1 ring-slate-200">
              <Spinner />
              Opening {host}…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
