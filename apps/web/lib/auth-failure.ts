/**
 * Why a sign-in was refused, and what the person at the keyboard is told.
 *
 * The original rule was one message for every failure, so the form could not
 * be used to enumerate admins. That rule only ever needed to cover the checks
 * that run *before* the password is verified. Every refusal after that point
 * is reachable only by someone already holding the password, so naming it
 * tells an attacker nothing they have not got — while telling an operator the
 * difference between "wrong code" and "this deployment cannot read the stored
 * secret", which has already cost one debugging session to work out by hand.
 *
 * No `server-only` marker: the sign-in page renders these strings and the
 * provider throws these errors, and a second copy of the wording is how the
 * two drift apart.
 */
import { CredentialsSignin } from 'next-auth';

/** Every refusal the sign-in form knows how to explain. */
export type LoginFailureCode =
  'credentials' | 'not_enrolled' | 'totp_invalid' | 'totp_unreadable';

/**
 * Carries the reason out of `authorize()`. next-auth rethrows this instance
 * unchanged out of a server action, so the page reads `code` off the error
 * rather than parsing it back out of a redirect URL.
 */
export class LoginFailure extends CredentialsSignin {
  constructor(code: LoginFailureCode) {
    super();
    // Assigned after super(): CredentialsSignin's own constructor sets the
    // default 'credentials', and would otherwise win.
    this.code = code;
  }
}

/**
 * `credentials` stays deliberately vague. It is the only code an anonymous
 * stranger can provoke, and it covers "no such admin", "deactivated" and
 * "wrong password" alike — telling those three apart is exactly the
 * enumeration this form refuses to help with.
 */
export const LOGIN_FAILURE_MESSAGE: Record<LoginFailureCode, string> = {
  credentials:
    'That email, password and code did not match. Check the code has not just rolled over, then try again.',
  not_enrolled:
    'This account has not finished authenticator enrolment, so it cannot sign in yet. Ask another admin to re-issue your enrolment link.',
  totp_invalid:
    'Email and password were correct, but that authenticator code was not. A code lasts 30 seconds — wait for the next one and try again.',
  totp_unreadable:
    'Email and password were correct, but this deployment cannot decrypt your authenticator secret. Its ENCRYPTION_KEY is not the key the secret was enrolled under.',
};

const CODES = Object.keys(LOGIN_FAILURE_MESSAGE) as LoginFailureCode[];

/**
 * Narrows an untrusted `?error=` value. Anything unrecognised — including the
 * bare `?error=1` older links carry — falls back to the generic message.
 */
export function loginFailureCode(value: unknown): LoginFailureCode | null {
  if (typeof value !== 'string') return null;
  return CODES.find((code) => code === value) ?? null;
}
