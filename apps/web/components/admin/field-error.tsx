/**
 * The message that belongs to one field.
 *
 * `role="alert"` so it is announced when it appears rather than only when the
 * field is next focused — a rejection the admin has to go looking for is a
 * rejection that reads as the form silently doing nothing.
 *
 * Pulled out of `register-application-form.tsx` when the product picker became
 * its own component and needed the same three lines.
 */
export function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;

  return (
    <p role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}
