'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { Spinner } from '@/components/ui/spinner';

export interface ComposerState {
  error?: string;
  sent?: number;
}

function SendButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 px-5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition-[transform,opacity] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
    >
      {pending ? <Spinner /> : <Send className="size-4" aria-hidden="true" />}
      {pending ? 'Sending…' : 'Send'}
    </button>
  );
}

/**
 * Writes to a project's thread. The action is passed in because the portal
 * and the admin each post as themselves, through their own guard.
 *
 * Ctrl/⌘+Enter sends, which is what people who write a lot of messages try
 * first.
 */
export function MessageComposer({
  action,
  projectId,
  placeholder = 'Write a message…',
}: {
  action: (state: ComposerState, formData: FormData) => Promise<ComposerState>;
  projectId: number;
  placeholder?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  const id = `message-${projectId}`;

  useEffect(() => {
    if (state.sent) form.current?.reset();
  }, [state.sent]);

  return (
    <form
      ref={form}
      action={formAction}
      className="rounded-2xl border border-border bg-background p-2 shadow-sm transition-shadow focus-within:border-emerald-300 focus-within:shadow-md focus-within:shadow-emerald-500/10"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor={id} className="sr-only">
        Message
      </label>
      <textarea
        id={id}
        name="body"
        rows={3}
        required
        maxLength={5000}
        placeholder={placeholder}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? `${id}-error` : undefined}
        className="w-full resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            form.current?.requestSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-3 px-1.5 pb-0.5">
        <p
          id={`${id}-error`}
          role={state.error ? 'alert' : undefined}
          className="text-[13px] text-destructive"
        >
          {state.error ?? (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Ctrl + Enter to send
            </span>
          )}
        </p>
        <SendButton />
      </div>
    </form>
  );
}
