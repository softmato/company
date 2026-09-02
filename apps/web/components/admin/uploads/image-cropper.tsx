'use client';

import {
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/cn';
import { formatBytes } from '@/lib/uploads/describe';

import { encodeCrop } from './crop-encode';
import {
  ASPECT_CHOICES,
  centreOffset,
  clampOffset,
  coverScale,
  frameFor,
  MAX_ZOOM,
  zoomAboutCentre,
  type CropAspect,
  type Frame,
  type Offset,
} from './crop-geometry';

/**
 * The crop-and-adjust step, between picking a file and uploading it.
 *
 * Cropping here rather than server-side is the point: the founder sees the
 * exact framing that will appear on the site, and only the pixels they chose
 * ever leave the machine. It also re-encodes, which strips EXIF — including
 * the GPS coordinates a phone photo carries — before anything reaches a public
 * bucket.
 *
 * Built on the native `<dialog>` and `showModal()`, like `ConfirmDialog`, so
 * focus trapping, the inert backdrop and Escape come from the platform rather
 * than a hand-rolled focus loop.
 *
 * **Cancel uploads nothing.** Escape, the backdrop and the Cancel button all
 * land in `onCancel`, and the file is dropped — an image appearing on the site
 * after a cancelled crop is the worst outcome this dialog could have.
 */

/** The frame is sized to this box, so a 16:9 crop is not judged in a thumbnail. */
const BOUNDS: Frame = { height: 360, width: 520 };

export function ImageCropper({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  /** Receives the cropped file, ready to upload. */
  onCropped: (cropped: File) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    origin: Offset;
    pointerId: number;
    start: Offset;
  } | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [aspect, setAspect] = useState<CropAspect>(null);

  /**
   * The framing the person has chosen, tagged with what it was chosen *for*.
   *
   * Frame, minimum scale and the starting offset all fall out of the image and
   * the ratio, so they are computed below rather than stored — storing them
   * would mean an effect writing state on every ratio change, and a render in
   * between where the offset belongs to the old frame and the picture sits
   * half outside the new one. Tagging instead makes a stale adjustment
   * unusable rather than merely wrong: when the tag does not match, the
   * defaults win and the crop recentres.
   */
  const [view, setView] = useState<{
    key: string;
    offset: Offset;
    scale: number;
  } | null>(null);

  /* ── Open as a modal for as long as there is a file ───────────────── */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  /* ── Load the picked file ─────────────────────────────────────────── */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const loaded = new Image();

    /*
     * Cleanup revokes the URL, which makes the in-flight load fail — and in
     * development React runs every effect twice, so the *first* pass reliably
     * errors after the second has already started. Without this flag the
     * dialog shows "could not be opened" over an image that opened perfectly
     * well. The flag makes a superseded load silent rather than wrong.
     */
    let live = true;

    loaded.onload = () => {
      if (live) setImage(loaded);
    };
    loaded.onerror = () => {
      if (live) setError('That file could not be opened as an image.');
    };
    loaded.src = url;

    return () => {
      live = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  /* ── Everything the frame implies, derived ────────────────────────── */
  /* Memoised only so `applyScale` is not rebuilt on every render by a fresh object. */
  const natural = useMemo<Frame | null>(
    () =>
      image ? { height: image.naturalHeight, width: image.naturalWidth } : null,
    [image],
  );

  const frame = natural
    ? frameFor(aspect ?? natural.width / natural.height, BOUNDS)
    : BOUNDS;

  const minScale = natural ? coverScale(natural, frame) : 1;

  /** Changing the file or the ratio changes this, which discards the view. */
  const viewKey = `${image?.src ?? ''}:${aspect ?? 'original'}`;

  const framing =
    view?.key === viewKey
      ? view
      : {
          key: viewKey,
          offset: natural
            ? centreOffset(natural, frame, minScale)
            : { x: 0, y: 0 },
          scale: minScale,
        };

  const { offset, scale } = framing;

  const applyScale = useCallback(
    (next: number) => {
      if (!natural) return;

      const clamped = Math.min(minScale * MAX_ZOOM, Math.max(minScale, next));

      setView({
        key: viewKey,
        offset: clampOffset(
          zoomAboutCentre(offset, frame, scale, clamped),
          natural,
          frame,
          clamped,
        ),
        scale: clamped,
      });
    },
    [frame, minScale, natural, offset, scale, viewKey],
  );

  /* ── Paint ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = frame.width * dpr;
    canvas.height = frame.height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, frame.width, frame.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      offset.x,
      offset.y,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    );
  }, [frame, image, offset, scale]);

  /* Wheel-to-zoom needs a non-passive listener, which JSX onWheel cannot be. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      applyScale(scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12));
    }

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyScale, scale]);

  /* ── Pan ──────────────────────────────────────────────────────────── */
  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!image) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      origin: offset,
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || !natural || drag.pointerId !== event.pointerId) return;

    setView({
      key: viewKey,
      offset: clampOffset(
        {
          x: drag.origin.x + (event.clientX - drag.start.x),
          y: drag.origin.y + (event.clientY - drag.start.y),
        },
        natural,
        frame,
        scale,
      ),
      scale,
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  /* ── Confirm ──────────────────────────────────────────────────────── */
  async function handleConfirm() {
    if (!image) return;

    setBusy(true);
    setError('');

    try {
      onCropped(
        await encodeCrop({
          frame,
          image,
          name: file.name,
          offset,
          scale,
          type: file.type,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not prepare the image. Please try another file.',
      );
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="crop-title"
      aria-describedby="crop-description"
      onCancel={(event) => {
        /* Escape. Preventing the default close lets React own the state. */
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel();
      }}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-0 text-foreground shadow-float backdrop:bg-black/40 open:animate-rise"
    >
      <div className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
        <h2 id="crop-title" className="headline text-[17px]">
          Adjust before uploading
        </h2>
        <p
          id="crop-description"
          className="mt-1.5 text-sm text-muted-foreground"
        >
          Drag to move, scroll or use the slider to zoom. Only what you see here
          is uploaded.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          >
            {error}
          </p>
        ) : null}

        {/* ── Ratio ──────────────────────────────────────────────── */}
        <div
          role="group"
          aria-label="Crop shape"
          className="mt-4 flex flex-wrap gap-1.5"
        >
          {ASPECT_CHOICES.map((choice) => {
            const active = choice.value === aspect;

            return (
              <button
                key={choice.label}
                type="button"
                aria-pressed={active}
                disabled={!image || busy}
                onClick={() => setAspect(choice.value)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-[13px] font-medium transition',
                  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {choice.label}
              </button>
            );
          })}
        </div>

        {/* ── Frame ──────────────────────────────────────────────── */}
        <div
          className="mt-3 flex items-center justify-center rounded-lg bg-muted"
          style={{ height: BOUNDS.height }}
        >
          {image ? (
            <canvas
              ref={canvasRef}
              onPointerCancel={handlePointerUp}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{ height: frame.height, width: frame.width }}
              className="touch-none cursor-grab rounded-md ring-1 ring-border active:cursor-grabbing"
            />
          ) : error ? null : (
            <Spinner className="size-6 text-muted-foreground" />
          )}
        </div>

        {/* ── Zoom ───────────────────────────────────────────────── */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground">Zoom</span>
          <input
            type="range"
            aria-label="Zoom"
            disabled={!image || busy}
            min={minScale}
            max={minScale * MAX_ZOOM}
            step={minScale / 50}
            value={scale}
            onChange={(event) => applyScale(Number(event.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="w-24 text-right text-[13px] tabular-nums text-muted-foreground">
            {formatBytes(file.size)} in
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!image || busy}>
            {busy ? 'Preparing…' : 'Upload this'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
