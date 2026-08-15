/**
 * Boot-time environment validation (docs/ENVIRONMENT.md §2).
 *
 * "A missing ENCRYPTION_KEY must fail at startup, not at the first login."
 *
 * Server-only. Importing this from a client component is a build error by
 * design — `server-only` makes the mistake impossible rather than merely
 * discouraged.
 */
import 'server-only';
import { z } from 'zod';

const hex32 = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, 'must be 32 bytes of hex (64 characters)');

const serverSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_ENV: z.enum(['local', 'preview', 'production']).default('local'),

  DATABASE_URL: z.string().url(),

  AUTH_SECRET: z.string().min(32, 'generate with: openssl rand -base64 32'),
  AUTH_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(16),
  /** AES-256-GCM key for TOTP secrets at rest. */
  ENCRYPTION_KEY: hex32,

  PAYMENT_MODE: z.enum(['sandbox', 'live']).default('sandbox'),

  COMPANY_NAME: z.string().default('Softmato Technology Pvt Ltd'),

  /*
   * Email. Optional: the contact form always writes to the database, and only
   * additionally emails when these are set. A missing key must not lose an
   * enquiry, so it degrades rather than throwing (docs/PRD.md §5.1).
   */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  /** Where contact enquiries are sent. */
  COMPANY_EMAIL: z.string().email().optional(),

  /*
   * Cloudflare R2. Optional as a group: with none of it set, the CMS image
   * fields stay plain URL inputs and uploading is simply unavailable. All or
   * nothing is checked below — a half-configured bucket fails at upload time,
   * which is exactly the late failure this file exists to prevent.
   */
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_BUCKET: z.string().optional(),
  /** Public base URL the bucket is served from, e.g. https://cdn.softmato.com */
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  /**
   * S3 endpoint. Cloudflare prints it on the bucket page, so it is accepted
   * here rather than silently ignored; when unset it is derived from the
   * account id, which is the same string.
   */
  R2_ENDPOINT: z.string().url().optional(),
  /**
   * Payment proofs, invoice PDFs, client documents — Phase 3 onwards. Read by
   * nothing yet, and deliberately outside the all-or-nothing group below: the
   * public bucket must be usable before the private one exists.
   */
  R2_PRIVATE_BUCKET: z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_CHECKOUT_URL: z.string().url(),
});

function parse<T extends z.ZodTypeAny>(schema: T, source: unknown): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // The variable NAMES are safe to print. The values never are.
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }

  return result.data;
}

export const env = {
  ...parse(serverSchema, process.env),
  ...parse(publicSchema, {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CHECKOUT_URL: process.env.NEXT_PUBLIC_CHECKOUT_URL,
  }),
};

/**
 * A preview deployment must never hold live provider credentials
 * (docs/ENVIRONMENT.md §4).
 */
if (env.APP_ENV === 'preview' && env.PAYMENT_MODE === 'live') {
  throw new Error(
    'PAYMENT_MODE=live is not permitted on a preview deployment. ' +
      'Every preview runs against provider sandboxes.',
  );
}

/**
 * R2 is all-or-nothing.
 *
 * A partially configured bucket would pass boot and then fail on the first
 * upload — the late failure this module exists to prevent.
 */
const R2_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_BUCKET',
  'R2_PUBLIC_BASE_URL',
] as const;

const r2Set = R2_KEYS.filter((key) => env[key]);

if (r2Set.length > 0 && r2Set.length < R2_KEYS.length) {
  const missing = R2_KEYS.filter((key) => !env[key]);
  throw new Error(
    `R2 is partially configured. Missing: ${missing.join(', ')}. ` +
      'Set all of them or none — a half-configured bucket fails at upload.',
  );
}

/** True when uploads are available. */
export const r2Configured = r2Set.length === R2_KEYS.length;
