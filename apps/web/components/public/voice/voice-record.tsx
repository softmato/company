'use client';

import { useRef, useState, type RefObject } from 'react';
import { Mic } from 'lucide-react';

import { cn } from '@/lib/cn';
import { joinText, useVoiceSupported } from './use-voice-capture';
import { VoiceOverlay } from './voice-overlay';

/**
 * "Record your query": opens the listening overlay over `field` and types
 * what it hears into it, after whatever was already there.
 *
 * Renders nothing where the browser has no speech recognition (Firefox), so
 * nobody is offered a button that cannot work.
 */
export function VoiceRecord({
  field,
  text,
  onText,
  onDone,
  className,
}: {
  field: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onText: (text: string) => void;
  onDone?: () => void;
  className?: string;
}) {
  const supported = useVoiceSupported();
  const [open, setOpen] = useState(false);
  const before = useRef('');

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          before.current = text;
          setOpen(true);
        }}
        className={cn(
          'group inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-primary pl-2.5 pr-3.5 text-[13px] font-medium text-primary-foreground',
          'shadow-[0_6px_18px_-8px_var(--primary)] transition-[background-color,transform] duration-150 ease-out',
          'hover:bg-primary-hover active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          className,
        )}
      >
        <Mic className="size-4 transition-transform duration-200 ease-out group-hover:scale-110" />
        Record your query
      </button>

      {open ? (
        <VoiceOverlay
          field={field}
          text={text}
          onText={(heard) => onText(joinText(before.current, heard))}
          onClose={() => {
            setOpen(false);
            onDone?.();
          }}
        />
      ) : null}
    </>
  );
}
