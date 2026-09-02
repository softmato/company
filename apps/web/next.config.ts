import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

import { TRUSTED_IMAGE_HOSTNAMES } from './lib/images/trusted-hosts';

/**
 * ENVIRONMENT.md describes a single `.env.local` at the repository root, but
 * Next only reads env files from the app directory. Load the root file here so
 * the monorepo keeps one source of configuration rather than a copy per app.
 *
 * Existing process env always wins — Vercel's injected variables must not be
 * overridden by a file that happens to be present.
 */
function loadRootEnv(): void {
  const envPath = resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match as unknown as [string, string, string];
    process.env[key] ??= rawValue.replace(/^["']|["']$/g, '');
  }
}

loadRootEnv();

type RemotePatterns = NonNullable<
  NonNullable<NextConfig['images']>['remotePatterns']
>;

/**
 * `next/image` fetches only from hosts listed here, and an unlisted host is a
 * runtime error rather than a degraded image.
 *
 * Derived from `R2_PUBLIC_BASE_URL` rather than hardcoded: the bucket differs
 * per environment (dev buckets in preview, production buckets in production),
 * and CI builds with no R2 at all. With the variable unset there are no remote
 * patterns and `CmsImage` falls back to a plain `<img>`, which is what keeps
 * that build working.
 */
/**
 * Hosts we optimise from besides our own bucket.
 *
 * One named host, never a wildcard: the reason `CmsImage` falls back to a
 * plain `<img>` for unknown hosts is that allowing every host would turn the
 * optimiser into an open image proxy anyone could point at anything. Adding a
 * host here is a deliberate act, and this one carries the marketing imagery
 * until the company's own photography replaces it.
 */
const TRUSTED_IMAGE_HOSTS: RemotePatterns = TRUSTED_IMAGE_HOSTNAMES.map(
  (hostname) => ({ protocol: 'https', hostname, pathname: '/**' }),
);

function r2RemotePatterns(): RemotePatterns {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return [];

  try {
    const { protocol, hostname } = new URL(base);
    if (protocol !== 'https:' && protocol !== 'http:') return [];

    return [
      {
        protocol: protocol === 'https:' ? 'https' : 'http',
        hostname,
        pathname: '/**',
      },
    ];
  } catch {
    // A malformed URL is caught by the Zod schema at boot; don't fail the build here.
    return [];
  }
}

/**
 * The compressed Chromium, listed per route rather than globally.
 *
 * It is 65 MB against a function's size budget, so it goes only to the
 * handlers that can actually start a browser: the ones that read a document as
 * PDF, and the ones that produce a document — `POST /v1/invoices` and the two
 * paths a payment can settle down. Adding it everywhere would put it in every
 * API function on the deployment for the benefit of five.
 */
const CHROMIUM_BINARY = './node_modules/@sparticuz/chromium/bin/**';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [...r2RemotePatterns(), ...TRUSTED_IMAGE_HOSTS],
  },
  // This repository maintains its own CLAUDE.md at the root; Next's generated
  // per-app copies are noise.
  agentRules: false,
  // Workspace packages ship TypeScript source, not build output.
  transpilePackages: [
    '@softmato/accounting',
    '@softmato/db',
    '@softmato/payment-core',
    '@softmato/sdk',
    '@softmato/ui',
  ],
  serverExternalPackages: [
    // Native module — must not be bundled.
    '@node-rs/argon2',
    'pg',
    '@neondatabase/serverless',
    /*
     * The PDF engine. `@sparticuz/chromium` locates its own compressed binary
     * relative to its package directory, so a bundler that inlines it moves
     * the code away from `bin/` and the package throws at the point of use
     * rather than at build. `puppeteer-core` is external for the same family
     * of reasons — it resolves files at runtime.
     */
    '@sparticuz/chromium',
    'puppeteer-core',
  ],
  /*
   * Externalising a package keeps it out of the bundle; it does not guarantee
   * its non-JavaScript files are traced into the deployment. The 65 MB of
   * compressed Chromium is exactly such a file, and a function that ships the
   * loader without the binary fails only when someone downloads an invoice.
   */
  outputFileTracingIncludes: Object.fromEntries(
    [
      /* Reads a document: `?format=pdf`. */
      '/api/v1/invoices/**',
      '/api/v1/receipts/**',
      '/api/internal/documents/**',
      /*
       * Writes one. `POST /v1/invoices` pre-renders after its response, and
       * both settlement paths render the receipt that goes on the email —
       * the gateway's return page and the polling job that catches the
       * payments whose return never happened.
       */
      '/api/jobs/poll-pending-transactions/**',
      /*
       * `*` for the session id, not the literal `[sessionId]`: these keys are
       * globs, and a bracketed segment reads as a character class that matches
       * every route except the one meant.
       */
      '/checkout/*/callback',
    ].map((route) => [route, [CHROMIUM_BINARY]]),
  ),
};

export default nextConfig;
