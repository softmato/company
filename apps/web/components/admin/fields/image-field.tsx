'use client';

import { useState } from 'react';

import { ImageUploader } from '@/components/admin/uploads';

import { describedBy, FieldShell, inputClass } from './field-shell';
import type { FieldProps } from './types';

/**
 * An image URL, with the global uploader alongside it when R2 is configured.
 *
 * The URL input is always present and always authoritative — the uploader just
 * fills it in. That keeps the field usable before storage exists, and lets an
 * image hosted elsewhere be pasted in without a second code path.
 *
 * Everything about *how* a file reaches storage lives in the uploader
 * (`components/admin/uploads`), so this stays a field: a labelled text input
 * that happens to have a drop zone under it.
 */
export function ImageField({
  spec,
  defaultValue,
  error,
  uploadEnabled = false,
}: FieldProps & { uploadEnabled?: boolean | undefined }) {
  const [url, setUrl] = useState(defaultValue);
  /* What the uploader last put here, so its thumbnail is not drawn twice. */
  const [uploadedUrl, setUploadedUrl] = useState('');

  function takeUploadedUrl(next: string) {
    setUploadedUrl(next);
    setUrl(next);
  }

  return (
    <FieldShell
      name={spec.name}
      label={spec.label}
      hint={spec.hint}
      error={error}
      required={spec.required}
    >
      <input
        id={spec.name}
        name={spec.name}
        type="text"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(spec.name, spec.hint, error)}
        className={inputClass}
      />

      {uploadEnabled ? (
        <ImageUploader
          label={`Upload ${spec.label.toLowerCase()}`}
          onChange={takeUploadedUrl}
        />
      ) : null}

      {/*
        Only for a URL the uploader is not already showing. Pasting a link is
        the other half of this field and deserves the same look-see before
        saving, but the uploader draws its own thumbnail for what it sent, and
        two previews of one image reads as a bug.
      */}
      {url && url !== uploadedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="mt-3 max-h-32 rounded-md border border-border"
        />
      ) : null}
    </FieldShell>
  );
}
