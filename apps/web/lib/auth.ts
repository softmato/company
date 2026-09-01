/**
 * Admin authentication: email + argon2id password + mandatory TOTP.
 *
 * All three are required in a single step. There is no "password accepted,
 * now enter your code" intermediate session — a half-authenticated state is a
 * state that can be mishandled, and `admin_users` cannot represent an active
 * admin without TOTP anyway (docs/DATABASE.md §2.4).
 *
 * JWT sessions, not database sessions: `proxy.ts` runs on every matched
 * request and checks a session without a database round trip. (It runs on the
 * Node.js runtime since the `proxy` rename, so a query is now possible — the
 * point is that it should not need one.)
 */
import 'server-only';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { adminUsers, db } from '@softmato/db';

import { recordAudit } from './audit';
import { LoginFailure } from './auth-failure';
import { verifyPassword } from './password.core';
import { checkTotp } from './totp';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().regex(/^\d{6}$/),
});

/**
 * A dummy argon2id hash of a random value. Verifying against it when no user
 * exists keeps the response time of "unknown email" indistinguishable from
 * "wrong password", so login cannot be used to enumerate admins.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29mdG1hdG9kdW1teXNhbHQ$3S8xdOkQ3xW5xk1Jm0GhIfJmXWJ3Xk1XZ0YQ0Zx2Xk0';

export const authConfig = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: 'Authenticator code', type: 'text' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) throw new LoginFailure('credentials');

        const { email, password, totp } = parsed.data;

        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, email.toLowerCase()))
          .limit(1);

        // Constant work whether or not the account exists.
        const passwordOk = await verifyPassword(
          user?.passwordHash ?? DUMMY_HASH,
          password,
        );

        if (!user || !user.isActive || !passwordOk) {
          await recordAudit({
            actorType: 'system',
            action: 'admin.login_failed',
            resourceType: 'admin_user',
            resourceId: email.toLowerCase(),
            afterState: { reason: 'invalid_credentials' },
          });
          throw new LoginFailure('credentials');
        }

        // The database forbids an active admin without TOTP; this is the
        // application refusing to proceed if that ever stopped being true.
        if (!user.totpEnabled || !user.totpSecret) {
          await recordAudit({
            actorType: 'system',
            action: 'admin.login_failed',
            resourceType: 'admin_user',
            resourceId: String(user.id),
            afterState: { reason: 'totp_not_enrolled' },
          });
          throw new LoginFailure('not_enrolled');
        }

        // Past this point the password has already been verified, so
        // naming the failure cannot help anyone enumerate admins — and
        // 'unreadable' is a deployment fault the operator has to be told
        // about rather than a code they can retype.
        const totpCheck = checkTotp(user.totpSecret, totp);

        if (totpCheck !== 'ok') {
          const reason =
            totpCheck === 'unreadable' ? 'totp_unreadable' : 'invalid_totp';

          await recordAudit({
            actorType: 'admin',
            actorId: String(user.id),
            action: 'admin.login_failed',
            resourceType: 'admin_user',
            resourceId: String(user.id),
            afterState: { reason },
          });

          throw new LoginFailure(
            totpCheck === 'unreadable' ? 'totp_unreadable' : 'totp_invalid',
          );
        }

        await db
          .update(adminUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(adminUsers.id, user.id));

        await recordAudit({
          actorType: 'admin',
          actorId: String(user.id),
          action: 'admin.login',
          resourceType: 'admin_user',
          resourceId: String(user.id),
        });

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? 'founder';
        // Only ever set for a login that cleared password AND TOTP.
        token.mfa = true;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.role = (token.role as string) ?? 'founder';
        session.user.mfa = token.mfa === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
