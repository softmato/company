/**
 * A SaaS customer's webhook endpoint, in about eighty lines.
 *
 * Phase 3 acceptance 5 is "the SaaS receives a signed webhook and verifies the
 * signature". Nothing in this repo could demonstrate that, because the
 * verifying half is by definition somebody else's server — `packages/sdk`
 * exports `verifyWebhook` and the unit tests exercise it against fabricated
 * headers, which proves the function and not the delivery.
 *
 * So this is the other end of the wire: a real HTTP server that receives a
 * real delivery from `retry-webhooks`, verifies it exactly the way the SDK
 * docstring tells an integrator to, and prints the verdict. It is the same
 * four lines a customer would write.
 *
 *   pnpm webhook:receive                 # listens on 4000
 *   pnpm webhook:receive -- --port 4100
 *
 * Point an application at it and settle a payment:
 *
 *   UPDATE applications
 *      SET webhook_url = 'http://localhost:4000/webhooks/softmato'
 *    WHERE client_id = 'app_test_hostelhub_2d90d3bq';
 *
 * The signing secret is the application's **`webhook_secret`** column — not
 * its client secret. They are different credentials and only one of them can
 * work here: the client secret is argon2-hashed and unrecoverable, while
 * `webhook_secret` is stored in plaintext because HMAC needs the value back.
 * `webhooks/enqueue.ts` signs with it, so this must verify with it.
 *
 *   SELECT webhook_secret FROM applications WHERE client_id = '…';
 *
 * Pass it with --secret, or set SOFTMATO_WEBHOOK_SECRET.
 *
 * Deliberately **not** a route in `apps/web`. A verifier living in the sending
 * application proves nothing about the contract and would ship to production
 * as an endpoint nobody meant to expose.
 */
import { createServer } from 'node:http';

import { verifyWebhook } from '../packages/sdk/index.ts';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const port = Number(flag('--port') ?? 4000);
const secret = flag('--secret') ?? process.env.SOFTMATO_WEBHOOK_SECRET;

if (!secret) {
  console.error(
    'No signing secret. Pass --secret <webhook secret> or set SOFTMATO_WEBHOOK_SECRET.\n' +
      'It is applications.webhook_secret — NOT the client secret — for the\n' +
      'application whose webhook_url points here:\n' +
      "  SELECT webhook_secret FROM applications WHERE client_id = '...';",
  );
  process.exit(1);
}

const server = createServer((request, response) => {
  const chunks: Buffer[] = [];

  request.on('data', (chunk: Buffer) => chunks.push(chunk));
  request.on('end', () => {
    // The raw body, before any parsing. Re-serialising JSON changes the bytes
    // and the signature is over bytes — this is the mistake the SDK docstring
    // warns about, so the demonstration had better not make it.
    const body = Buffer.concat(chunks).toString('utf8');

    const result = verifyWebhook({
      secret,
      body,
      // No casts. `node:http` types these as `string | string[] | undefined`
      // and an absent header really is `undefined` — asserting otherwise is
      // how the missing-signature crash got in here in the first place.
      signature: headerValue(request.headers['x-softmato-signature']),
      timestamp: headerValue(request.headers['x-softmato-timestamp']),
    });

    const when = new Date().toISOString();

    if (!result.valid) {
      console.log(`\n[${when}] REJECTED — ${result.reason}`);
      console.log('  body:', body.slice(0, 300));
      response.writeHead(400).end('invalid');
      return;
    }

    console.log(`\n[${when}] VERIFIED — event ${result.payload.event}`);
    console.log(JSON.stringify(result.payload, null, 2));

    // 2xx is what stops the retry job re-sending this delivery.
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{"ok":true}');
  });
});

/** A repeated header arrives as an array; take the first and let it fail. */
function headerValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}/webhooks/softmato`);
  console.log('Point an application webhook_url here, then settle a payment.');
});
