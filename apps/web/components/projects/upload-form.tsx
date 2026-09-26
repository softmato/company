'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';

import { SubmitButton } from '@/components/admin/submit-button';
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_DESCRIPTION,
} from '@/lib/projects/document-file';

export interface UploadFormState {
  error?: string;
  uploaded?: number;
}

/**
 * Adds a file to a project: a drop-target-looking picker, then Upload. The
 * action decides who is uploading.
 */
export function UploadForm({
  action,
  projectId,
}: {
  action: (
    state: UploadFormState,
    formData: FormData,
  ) => Promise<UploadFormState>;
  projectId: number;
}) {
  const [state, formAction] = useActionState(action, {});
  const [chosen, setChosen] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const id = `upload-${projectId}`;

  // A new upload clears the picked name — set during render, not in the effect.
  const [seen, setSeen] = useState(state.uploaded);
  if (state.uploaded !== seen) {
    setSeen(state.uploaded);
    setChosen(null);
  }

  useEffect(() => {
    if (state.uploaded) form.current?.reset();
  }, [state.uploaded]);

  return (
    <form ref={form} action={formAction} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <label
        htmlFor={id}
        className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-300/70 bg-emerald-50/60 px-4 py-5 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
      >
        <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">
          <Upload className="size-5" aria-hidden="true" />
        </span>
        <span className="mt-1 text-sm font-medium">
          {chosen ?? 'Choose a file to share'}
        </span>
        <span id={`${id}-help`} className="text-xs text-muted-foreground">
          {ACCEPTED_DESCRIPTION}, up to 4 MB
        </span>
        <input
          id={id}
          name="file"
          type="file"
          required
          accept={ACCEPT_ATTRIBUTE}
          aria-describedby={`${id}-help`}
          className="sr-only"
          onChange={(event) => setChosen(event.target.files?.[0]?.name ?? null)}
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {state.error}
        </p>
      ) : state.uploaded ? (
        <p
          role="status"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Uploaded — it is in the list above.
        </p>
      ) : null}

      {chosen ? (
        <SubmitButton pendingLabel="Uploading…" className="w-full">
          Upload {chosen.length > 28 ? 'file' : chosen}
        </SubmitButton>
      ) : null}
    </form>
  );
}
