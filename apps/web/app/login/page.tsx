/**
 * Admin sign-in. Email, password, and authenticator code in one step — there
 * is no partially-authenticated state to mishandle.
 */
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Wordmark } from '@/components/public/wordmark';

export default async function LoginPage({
  searchParams,
}: PageProps<'/login'>) {
  const { error } = await searchParams;
  const failed = error === '1';

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
      if (err instanceof AuthError) {
        // One message for every failure mode. Distinguishing "no such account"
        // from "wrong password" would let anyone enumerate admins.
        redirect('/login?error=1');
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
          Staff accounts only. Sessions last 12 hours.
        </p>

        {/*
          The error is rendered, not just redirected to. The signIn catch
          above sends failures to `?error=1`, and a sign-in that silently
          reloads a blank form reads as a broken page rather than a refusal.

          The wording stays deliberately vague about which half was wrong, for
          the same reason the redirect is: naming it enumerates admins. It
          also promises nothing about attempts remaining — we do not count
          them, and a made-up number is a worse lie than no number.
        */}
        {failed ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          >
            That email, password and code did not match. Check the code has not
            just rolled over, then try again.
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

      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        Locked out? Ask the other admin to reset you.
      </p>
    </main>
  );
}
