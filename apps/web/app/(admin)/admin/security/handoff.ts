import 'server-only';

/**
 * What you hand a new admin, built in one place.
 *
 * Three screens now produce one of these — creating an account, re-issuing a
 * link for one that never enrolled, and the roster's own re-issue button — and
 * the three steps that make it (mint a token, build the URL, render the QR)
 * have to stay in agreement. A second copy is how one of them ends up minting
 * against a stale subject or rendering a QR of something other than the link
 * printed beside it.
 *
 * Not a `'use server'` module: it is called *by* actions, and a server action
 * file may only export async functions, which would make the `Handoff` type
 * homeless.
 */
import { enrolmentUrl } from '@/lib/enrolment/link';
import { qrSvg } from '@/lib/enrolment/qr';
import {
  mintEnrolmentToken,
  type EnrolmentSubject,
} from '@/lib/enrolment/token';

export interface Handoff {
  email: string;
  /** `/enrol?token=…`. A bearer credential — see `token.ts`. */
  url: string;
  /** Inline SVG of `url`, so the new admin can scan it off this screen. */
  qr: string;
  expiresAt: string;
  /** True when this replaced a link for an account that already existed. */
  reissued: boolean;
}

/**
 * The token is deliberately not audited. It is a live bearer credential for
 * exactly one act — enrolling this account — and `audit_logs` is append-only by
 * trigger, so anything written there cannot be taken back out.
 */
export async function buildHandoff(
  subject: EnrolmentSubject,
  reissued: boolean,
): Promise<Handoff> {
  const { token, expiresAt } = mintEnrolmentToken(subject);
  const url = enrolmentUrl(token);

  return {
    email: subject.email,
    url,
    qr: await qrSvg(url),
    expiresAt: expiresAt.toISOString(),
    reissued,
  };
}
