'use client';

import { useId, useState, type DragEvent } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/cn';
import {
  ACCEPT_ATTRIBUTE,
  describeSourceRejection,
  formatBytes,
  UPLOAD_HINT,
} from '@/lib/uploads/describe';

import { isCroppable } from './crop-encode';
import { ImageCropper } from './image-cropper';
import {
  useImageUpload,
  type ImageUploadApi,
  type UploadedImage,
  type UseImageUploadOptions,
} from './use-image-upload';

/**
 * The image field used across the admin — one look, two entry points:
 *
 * - `<ImageUploader onChange={…} />` when a screen only needs the field.
 * - `<ImageUploaderView upload={…} />` when the screen already holds a
 *   {@link useImageUpload} instance because it needs the URL for a submit.
 *
 * Three presentations off the same state, because the admin has three shapes
 * of slot to fill: a page-level drop target, a button beside an existing
 * value, and a paperclip inside a dense row.
 *
 * Progress is inline rather than in a toast: this admin has no global toaster,
 * and an upload attached to one field should report next to that field.
 */

export type ImageUploaderVariant = 'button' | 'compact' | 'dropzone';

/*
 * `| undefined` throughout: `exactOptionalPropertyTypes` is on, and
 * `ImageUploader` forwards these straight through to `ImageUploaderView`
 * whether or not its caller passed them.
 */
export interface ImageUploaderPresentation {
  className?: string | undefined;
  disabled?: boolean | undefined;
  hint?: string | undefined;
  label?: string | undefined;
  /** `lg` for a primary, page-level drop target; `sm` inside a dense form. */
  size?: 'lg' | 'sm' | undefined;
  variant?: ImageUploaderVariant | undefined;
}

/* ── Icons ──────────────────────────────────────────────────────────────
 * Inline rather than an icon package: three glyphs do not justify a
 * dependency, and every other icon in this codebase is drawn the same way.
 */

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-4', className)}
    >
      <path d="M8 10.5V2.5" />
      <path d="M5 5.5 8 2.5l3 3" />
      <path d="M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-3.5', className)}
    >
      <path d="M11 6 6.4 10.6a1.6 1.6 0 0 0 2.3 2.3l4.9-4.9a3.2 3.2 0 0 0-4.5-4.5L4 8.6a4.8 4.8 0 0 0 6.8 6.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/**
 * The uploaded file, shown back.
 *
 * The thumbnail is the point — a filename tells you nothing about whether you
 * picked the right photo.
 */
function AttachedImage({
  file,
  onRemove,
}: {
  file: UploadedImage;
  onRemove: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview of a freshly uploaded object. */}
          <img
            src={file.url}
            alt=""
            className="size-full object-cover"
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">
            {file.name}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            Uploaded · {formatBytes(file.sizeBytes)}
          </p>
        </div>
      </div>

      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export function ImageUploaderView({
  className,
  disabled = false,
  hint,
  label = 'Upload image',
  size = 'sm',
  upload,
  variant = 'dropzone',
}: ImageUploaderPresentation & { upload: ImageUploadApi }) {
  const [isDragging, setIsDragging] = useState(false);
  /* The picked file, held while the founder frames it. */
  const [cropping, setCropping] = useState<File | null>(null);
  const inputId = useId();

  const busy = upload.isUploading;
  const locked = disabled || busy;
  const large = size === 'lg';

  /**
   * The one entry point for a picked file, whether it arrived by drop or
   * through the input — so neither path can skip a step the other applies,
   * and a photo dragged in cannot sidestep the cropper.
   *
   * Nothing uploads straight from here. A croppable file goes to the dialog
   * and only its output is sent; an animated GIF has no crop step to run, so
   * it goes as it is (see `crop-encode.ts`).
   */
  function accept(picked: File | undefined) {
    if (!picked || locked) return;

    /*
     * The only size check that happens *before* the cropper. The 5 MB upload
     * cap is applied to the crop's output instead, because re-encoding is
     * usually what brings an oversized photo under it.
     */
    const tooBig = describeSourceRejection(picked);
    if (tooBig) {
      upload.fail(tooBig);
      return;
    }

    if (isCroppable(picked.type)) {
      setCropping(picked);
      return;
    }

    void upload.upload(picked);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    accept(event.dataTransfer.files?.[0]);
  }

  const fileInput = (
    <input
      type="file"
      id={inputId}
      accept={ACCEPT_ATTRIBUTE}
      disabled={locked}
      className="sr-only"
      onChange={(event) => {
        const input = event.currentTarget;
        accept(input.files?.[0]);
        /* Cleared so re-picking the same file still fires a change event. */
        input.value = '';
      }}
    />
  );

  const status = upload.status ? (
    <p
      role="status"
      className={cn(
        'mt-1.5 text-[13px]',
        upload.status.ok ? 'text-muted-foreground' : 'text-destructive',
      )}
    >
      {upload.status.text}
    </p>
  ) : null;

  const attached = upload.file ? (
    <AttachedImage file={upload.file} onRemove={upload.clear} />
  ) : null;

  /*
   * Keyed by the file, so picking a second image after cancelling the first
   * mounts a fresh dialog rather than reusing one still holding the old
   * framing.
   */
  const cropper = cropping ? (
    <ImageCropper
      key={`${cropping.name}:${cropping.lastModified}`}
      file={cropping}
      onCancel={() => setCropping(null)}
      onCropped={(cropped) => {
        setCropping(null);
        void upload.upload(cropped);
      }}
    />
  ) : null;

  /* ── Button and compact ───────────────────────────────────────────── */
  if (variant === 'button' || variant === 'compact') {
    const compact = variant === 'compact';

    return (
      <div className={className}>
        {cropper}
        {attached}
        <label
          htmlFor={inputId}
          className={cn(
            'mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition',
            'focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/50',
            compact
              ? 'border-border text-foreground hover:bg-muted'
              : 'border-primary/40 text-primary hover:bg-primary/5',
            locked && 'cursor-not-allowed opacity-60',
          )}
        >
          {busy ? (
            <Spinner className="size-4" />
          ) : compact ? (
            <PaperclipIcon />
          ) : (
            <UploadIcon />
          )}
          {busy ? 'Uploading…' : upload.file ? 'Replace' : label}
          {fileInput}
        </label>
        {status}
      </div>
    );
  }

  /* ── Dropzone ─────────────────────────────────────────────────────── */
  return (
    <div className={className}>
      {cropper}
      {attached}
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!locked) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center',
          'transition-[background-color,border-color] duration-150 ease-out',
          'hover:border-primary hover:bg-primary/5',
          'focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/50',
          large ? 'rounded-xl px-4 py-8' : 'px-4 py-4',
          isDragging && 'border-solid border-primary bg-primary/5',
          locked && 'cursor-not-allowed opacity-60 hover:border-border hover:bg-transparent',
        )}
      >
        {busy ? (
          <Spinner
            className={cn(large ? 'mb-1 size-6' : 'size-4', 'text-primary')}
          />
        ) : (
          <UploadIcon
            className={cn(
              large ? 'mb-1 size-6 text-primary' : 'size-4 text-muted-foreground',
            )}
          />
        )}

        <span
          className={cn(
            'font-semibold text-foreground',
            large ? 'text-sm' : 'text-xs',
          )}
        >
          {busy
            ? 'Uploading…'
            : isDragging
              ? 'Drop to upload'
              : large
                ? `${label} — drag & drop or click`
                : upload.file
                  ? 'Replace image'
                  : label}
        </span>

        <span
          className={cn(
            'text-muted-foreground',
            large ? 'text-xs' : 'text-[10px]',
          )}
        >
          {hint ?? UPLOAD_HINT}
        </span>

        {fileInput}
      </label>
      {status}
    </div>
  );
}

export type ImageUploaderProps = ImageUploaderPresentation &
  UseImageUploadOptions;

/** Self-managed field: owns its own upload state. */
export function ImageUploader({
  className,
  disabled,
  hint,
  label,
  size,
  variant,
  ...uploadOptions
}: ImageUploaderProps) {
  const upload = useImageUpload(uploadOptions);

  return (
    <ImageUploaderView
      className={className}
      disabled={disabled}
      hint={hint}
      label={label}
      size={size}
      upload={upload}
      variant={variant}
    />
  );
}
