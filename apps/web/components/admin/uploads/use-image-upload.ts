'use client';

import { useCallback, useState } from 'react';

import { uploadImage } from '@/lib/admin/upload-image';
import { describeRejection } from '@/lib/uploads/describe';

/**
 * Headless half of the uploader: the file the field is holding, and how to
 * replace it.
 *
 * Split from the markup so a screen that wants its own trigger — a photo chip,
 * a menu item — can drive the same upload without inheriting the drop zone.
 * `ImageUploader` is this hook plus a look.
 *
 * The field holds at most one image, because every place it is used stores a
 * single URL on a row. A gallery would need a list here, not a second uploader.
 */

export interface UploadedImage {
  name: string;
  sizeBytes: number;
  url: string;
}

export interface UploadStatus {
  ok: boolean;
  text: string;
}

export interface UseImageUploadOptions {
  /** Fires whenever the held image changes, including on clear. */
  onChange?: (url: string) => void;
}

export function useImageUpload({ onChange }: UseImageUploadOptions = {}) {
  const [file, setFile] = useState<UploadedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<UploadStatus | null>(null);

  /**
   * Not memoised: it closes over `onChange`, which call sites pass inline, and
   * it is only ever invoked from an event handler where a fresh closure is
   * exactly what we want.
   */
  async function upload(picked: File) {
    /* Refused locally so an obviously wrong file costs nothing. */
    const rejection = describeRejection(picked);
    if (rejection) {
      setStatus({ ok: false, text: rejection });
      return;
    }

    setIsUploading(true);
    setStatus(null);

    try {
      const result = await uploadImage(picked);

      if (result.ok && result.url) {
        setFile({
          name: picked.name,
          sizeBytes: picked.size,
          url: result.url,
        });
        onChange?.(result.url);
      }

      setStatus({
        ok: result.ok,
        text: result.message ?? (result.ok ? 'Uploaded.' : 'Upload failed.'),
      });
    } finally {
      setIsUploading(false);
    }
  }

  /**
   * Reports a problem the field found before an upload could start — a file
   * too big to open, a crop the browser could not encode.
   *
   * Exposed so those surface in the same place as every other outcome. A
   * second message channel beside `status` is how a field ends up showing a
   * stale success next to a fresh failure.
   */
  const fail = useCallback((text: string) => {
    setStatus({ ok: false, text });
  }, []);

  /**
   * Forgets the upload here; the object stays in the bucket.
   *
   * Deleting it would be wrong — by this point the URL may already be saved on
   * a row, and the key is content-addressed, so an orphan costs a few KB and
   * risks nothing. Bucket lifecycle rules are the right broom for those.
   */
  const clear = useCallback(() => {
    setFile(null);
    setStatus(null);
    onChange?.('');
  }, [onChange]);

  return { clear, fail, file, isUploading, status, upload };
}

export type ImageUploadApi = ReturnType<typeof useImageUpload>;
