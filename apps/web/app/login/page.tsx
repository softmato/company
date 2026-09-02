/**
 * Admin sign-in. Email, password, and authenticator code in one step — there
 * is no partially-authenticated state to mishandle.
 */
import { AuthError, CredentialsSignin } from 'next-auth';
import { redirect } from 'next/navigation';

import { signIn } from '@/lib/auth';
import { LOGIN_FAILURE_MESSAGE, loginFailureCode } from '@/lib/auth-failure';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Wordmark } from '@/components/public/wordmark';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { error, enrolled } = await searchParams;
  // An unrecognised code — including the bare `?error=1` this page used to
  // redirect to — falls back to the vague message rather than to no message.
  const failure = error ? (loginFailureCode(error) ?? 'credentials') : null;
  const justEnrolled = enrolled === '1';

  async function authenticate(formData: FormData): Promise<void> {
    'use server';

    try {
      await signIn('credentials', {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        totp: String(formData.get('totp') ?? ''),
        redirectTo: '/admin',
      });
    } catch (err) {
      // next-auth signals a successful redirect by throwing; let that through.
      //
      // `LoginFailure` arrives here as the same instance `authorize()` threw,
      // so the reason is read off the error rather than guessed at. Only the
      // checks that run before the password is verified collapse into the one
      // vague code — those are the ones that would otherwise enumerate admins.
      if (err instanceof CredentialsSignin) {
        redirect(`/login?error=${loginFailureCode(err.code) ?? 'credentials'}`);
      }
      if (err instanceof AuthError) {
        redirect('/login?error=credentials');
      }
      throw err;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-6 py-20">
      <Wordmark />

      <Card className="mt-5 px-6 py-6">
        <h1 className="headline text-[22px]">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Staff accounts only. Sessions last 8 hours.
        </p>

        {/*
          Arriving from a completed enrolment. Without this the redirect lands
          on a blank form that looks like the enrolment was thrown away — the
          same failure the `?error=1` banner below exists to prevent.
        */}
        {justEnrolled ? (
          <p
            role="status"
            className="mt-4 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-[13px] text-primary"
          >
            Authenticator set up. Sign in with your password and a code from it.
          </p>
        ) : null}

        {/*
          The error is rendered, not just redirected to: a sign-in that
          silently reloads a blank form reads as a broken page rather than a
          refusal.

          The wording lives in `lib/auth-failure.ts` beside the codes the
          provider throws, so the two cannot drift. It still promises nothing
          about attempts remaining — we do not count them, and a made-up
          number is a worse lie than no number.
        */}
        {failure ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          >
            {LOGIN_FAILURE_MESSAGE[failure]}
          </p>
        ) : null}

        <form action={authenticate} className="mt-5 grid gap-4">
          <Field id="email" label="Email" required>
            {(props) => (
              <Input
                {...props}
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            )}
          </Field>

          <Field id="password" label="Password" required>
            {(props) => (
              <Input
                {...props}
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            )}
          </Field>

          <Field
            id="totp"
            label="Authenticator code"
            help="The six digits from your authenticator app."
            required
          >
            {(props) => (
              <Input
                {...props}
                name="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                className="font-mono tracking-[0.3em]"
              />
            )}
          </Field>

          <Button type="submit" className="mt-1 w-full">
            Sign in
          </Button>
        </form>
      </Card>

      {/*
        Deliberately not a link. Every recovery route needs either a working
        second factor or shell access to the database, so there is nothing here
        a locked-out person could usefully click.
      */}
      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        Lost your authenticator? Another admin can re-issue you an enrolment
        link.
      </p>
    </main>
  );
}
