'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Check, X } from 'lucide-react';

import { Textarea } from '@/components/ui/input';
import { useVoiceCapture, type VoiceLang } from './use-voice-capture';
import { VoiceWave } from './voice-wave';
import './voice.css';

const LANGS: { value: VoiceLang; label: string }[] = [
  { value: 'en-IN', label: 'English' },
  { value: 'ne-NP', label: 'नेपाली' },
];

const STATUS_LINE = {
  starting: 'Starting the microphone',
  listening: 'Listening',
  blocked: 'Microphone blocked',
  failed: 'Voice input stopped',
} as const;

const TROUBLE = {
  blocked: 'Allow the microphone from the address bar, or close this and type.',
  failed: 'Voice input stopped. Check your connection, or type instead.',
} as const;

/**
 * The listening state: the page dims, the edge of the screen picks up a
 * little green, and the message box stays lit in place with a bar right under
 * it — language, live waveform, Done — while the words type themselves in.
 *
 * The box you see is a read-only copy laid exactly over the real one. The
 * dialog lives in the top layer, above everything on the page, so the real
 * field cannot be lifted through it — but the copy shows the same text in
 * the same place, so when the dialog fades out nothing moves.
 *
 * A native `<dialog>` opened with `showModal()` buys the top layer, an inert
 * page and a focus trap without code. The page is scrolled so the box is
 * centred, then locked (`data-lenis-prevent` plus `overflow: hidden` on
 * `<html>`, keeping the scrollbar's gutter so nothing shifts under the copy).
 *
 * Closing plays the exit animation, then closes the dialog, whose `close`
 * event calls `onClose` — after the page is interactive again, so the caller
 * can put focus back in the real field.
 */
export function VoiceOverlay({
  field,
  text,
  onText,
  onClose,
}: {
  field: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onText: (text: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const copy = useRef<HTMLTextAreaElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<VoiceLang>('en-IN');
  const [closing, setClosing] = useState(false);
  const { status, analyser } = useVoiceCapture(lang, onText);

  useLayoutEffect(() => {
    const box = field.current;
    const sheet = dialog.current;
    if (!box || !sheet) return;

    const html = document.documentElement;
    const { overflow, scrollbarGutter } = html.style;
    box.scrollIntoView({ block: 'center', behavior: 'instant' });
    html.style.overflow = 'hidden';
    html.style.scrollbarGutter = 'stable';

    const place = () => {
      const r = box.getBoundingClientRect();
      sheet.style.setProperty('--fx', `${r.left}px`);
      sheet.style.setProperty('--fy', `${r.top}px`);
      sheet.style.setProperty('--fw', `${r.width}px`);
      sheet.style.setProperty('--fh', `${r.height}px`);
    };
    place();
    if (!sheet.open) sheet.showModal();
    window.addEventListener('resize', place);

    return () => {
      window.removeEventListener('resize', place);
      html.style.overflow = overflow;
      html.style.scrollbarGutter = scrollbarGutter;
    };
  }, [field]);

  // Keep the newest words in view as the copy fills up.
  useLayoutEffect(() => {
    const box = copy.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [text]);

  const close = () => setClosing(true);
  const trouble =
    status === 'blocked' || status === 'failed' ? TROUBLE[status] : null;

  return (
    <dialog
      ref={dialog}
      className="voice"
      data-state={closing ? 'closing' : 'open'}
      aria-label="Record your query"
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      // Chrome force-closes on a second Escape; keep React in step with it.
      onClose={onClose}
      onAnimationEnd={(event) => {
        if (event.animationName === 'voice-scrim-out') dialog.current?.close();
      }}
    >
      <div className="voice-scrim" aria-hidden />
      <div className="voice-edge dark" aria-hidden>
        <div className="voice-edge-flow" />
        <div className="voice-edge-glow" />
        <div className="voice-edge-flash" />
      </div>

      <div className="voice-field">
        <div ref={halo} className="voice-field-halo dark" aria-hidden />
        <Textarea
          ref={copy}
          readOnly
          tabIndex={-1}
          aria-hidden
          value={text}
          placeholder="Start speaking — we are listening…"
          className="size-full resize-none pb-12"
        />
      </div>

      {/* The waveform says "listening" to anyone who can see it. */}
      <p role="status" className="sr-only">
        {STATUS_LINE[status]}
      </p>

      <div className="voice-bar dark">
        <div className="voice-langs" role="group" aria-label="Language">
          <span
            className="voice-langs-thumb"
            data-second={lang === 'ne-NP' || undefined}
            aria-hidden
          />
          {LANGS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={lang === option.value}
              onClick={() => setLang(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {trouble ? (
          <p className="voice-trouble">{trouble}</p>
        ) : (
          <VoiceWave analyser={analyser} glow={halo} />
        )}

        <button type="button" className="voice-done" onClick={close} autoFocus>
          <Check />
          <span>Done</span>
        </button>
      </div>

      <button
        type="button"
        className="voice-close dark"
        aria-label="Close"
        onClick={close}
      >
        <X />
      </button>
    </dialog>
  );
}
