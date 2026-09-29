'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * Speech to text through the browser's own Web Speech API.
 *
 * Chrome and Edge stream the audio to Google's recogniser and hand back text,
 * so it costs nothing and needs no server of ours — but it needs a network,
 * and Firefox does not implement it at all. `useVoiceSupported` is how the
 * form swaps the button, where it cannot work, for a note naming the browsers
 * that can — rather than offering it and failing.
 *
 * `en-IN` rather than `en-US`: the people speaking to this form mostly have a
 * South Asian accent, and the Indian English model hears it noticeably better.
 */
export type VoiceLang = 'en-IN' | 'ne-NP';

export type VoiceStatus = 'starting' | 'listening' | 'blocked' | 'failed';

/** The slice of the API used here. lib.dom ships only the result types. */
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noSubscribe = () => () => {};

/**
 * Null on the server — the answer is only known in the browser, so neither
 * the button nor the "use another browser" note is in the server HTML.
 */
export function useVoiceSupported(): boolean | null {
  return useSyncExternalStore(
    noSubscribe,
    () => Boolean(recognitionCtor() && navigator.mediaDevices),
    () => null,
  );
}

export function joinText(...parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Listens until unmounted, calling `onText` with everything heard so far —
 * settled words plus the recogniser's current guess — on every result.
 *
 * Two things the naive version gets wrong:
 *
 *   - Chrome ends a "continuous" session by itself after a few seconds of
 *     silence. `onend` restarts it, carrying the text into `committed`
 *     because a new session starts with an empty result list.
 *   - Switching language has to restart the recogniser too. The words still
 *     in flight are committed as they stand, so nothing said is dropped.
 *
 * The microphone is opened separately with `getUserMedia` for the analyser
 * that drives the waveform. Asking for it first also means the permission
 * prompt, and a refusal, are handled before the recogniser ever starts.
 */
export function useVoiceCapture(
  lang: VoiceLang,
  onText: (text: string) => void,
) {
  const [status, setStatus] = useState<VoiceStatus>('starting');
  const [micReady, setMicReady] = useState(false);

  const analyser = useRef<AnalyserNode | null>(null);
  const committed = useRef('');
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    let stream: MediaStream | undefined;
    let audio: AudioContext | undefined;
    let cancelled = false;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(
      (granted) => {
        if (cancelled) {
          granted.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = granted;
        audio = new AudioContext();
        const node = audio.createAnalyser();
        node.fftSize = 128;
        node.smoothingTimeConstant = 0.78;
        audio.createMediaStreamSource(granted).connect(node);
        analyser.current = node;
        setMicReady(true);
      },
      (error: DOMException) => {
        if (cancelled) return;
        setStatus(error.name === 'NotAllowedError' ? 'blocked' : 'failed');
      },
    );

    return () => {
      cancelled = true;
      analyser.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      void audio?.close();
    };
  }, []);

  useEffect(() => {
    const Ctor = recognitionCtor();
    if (!micReady || !Ctor) return;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    let settled = '';
    let guess = '';
    let alive = true;

    rec.onstart = () => setStatus('listening');

    rec.onresult = ({ results }) => {
      const done: string[] = [];
      const pending: string[] = [];
      for (const result of Array.from(results)) {
        const words = result[0]?.transcript ?? '';
        (result.isFinal ? done : pending).push(words);
      }
      settled = joinText(...done);
      guess = joinText(...pending);

      onTextRef.current(joinText(committed.current, settled, guess));
    };

    rec.onerror = ({ error }) => {
      // Silence and our own abort both end the session; onend restarts it.
      if (error === 'no-speech' || error === 'aborted') return;
      alive = false;
      setStatus(
        error === 'not-allowed' || error === 'service-not-allowed'
          ? 'blocked'
          : 'failed',
      );
    };

    rec.onend = () => {
      committed.current = joinText(committed.current, settled);
      settled = '';
      guess = '';
      if (!alive) return;
      try {
        rec.start();
      } catch {
        setStatus('failed');
      }
    };

    rec.start();

    return () => {
      alive = false;
      committed.current = joinText(committed.current, settled, guess);
      rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.abort();
    };
  }, [lang, micReady]);

  return { status, analyser };
}
