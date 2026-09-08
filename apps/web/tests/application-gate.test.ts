/**
 * The re-authentication gate on `/admin/applications`, against real Postgres.
 *
 * The rule under test is one sentence — **the gate follows the mode, not the
 * verb** — and it is worth a test because the previous arrangement looked
 * reasonable while being backwards. Revealing a Sandbox signing secret cost a
 * password and a TOTP code; rotating a client secret, which kills a live
 * integration in 24 hours, and revoking one, which kills it instantly and
 * permanently, cost nothing at all.
 *
 * Since the credential split there is a second reason to test it here: the two
 * credential sets live on **one application**, so a gate that read the mode
 * from anywhere but the credential row would apply the wrong answer to half
 * the buttons on the page.
 *
 * Every action is exercised twice: once against a Sandbox credential, where it
 * must proceed with an empty form, and once against a Production credential,
 * where the same empty form must change nothing.
 *
 * **The assertions are on the database, not only on the returned message.** A
 * refusal that returns `ok: false` while having already rotated the secret is
 * exactly the bug this file exists to catch, so each Production case reads the
 * row back and checks it did not move.
 *
 * Three modules are mocked, and only three:
 *
 *   * `requireAdmin` — the session. There is no browser here, and "is there a
 *     session" is not what is being tested.
 *   * `reauthenticate` — so a correct password and code can be simulated
 *     without a real admin's TOTP secret. It is the *decision to call it* that
 *     matters here, and that is not mocked.
 *   * `revalidatePath` — Next's cache, which has no meaning outside a request.
 *
 * The mode itself is never mocked. It is read from the row by
 * `credentialGate`, which is the whole point: a gate whose condition comes
 * from the form is not a gate.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { desc, eq, inArray, like } from 'drizzle-orm';

import {
  applicationCredentials,
  applications,
  auditLogs,
  db,
  type CredentialMode,
} from '@softmato/db';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

vi.mock('@/app/(admin)/admin/cms/actions/shared', () => ({
  requireAdmin: async () => ADMIN_ID,
}));

const reauthOk = vi.fn(async () => ({ ok: true, totpSecret: 'x' }) as const);

vi.mock('@/app/(admin)/admin/security/reauth', () => ({
  reauthenticate: (...args: unknown[]) => reauthOk(...(args as [])),
}));

const {
  addCredentialAction,
  registerApplicationAction,
  revealWebhookSecretAction,
  revokeCredentialAction,
  rotateSecretAction,
  rotateWebhookSecretAction,
  setWebhookUrlAction,
  updateApplicationAction,
} = await import('@/app/(admin)/admin/applications/actions');

const ADMIN_ID = '1';
const PRODUCT = 'hostelhub';
const marker = `gatetest-${Date.now()}`;
const NAME = `Gate fixture ${marker}`;

/** The application both credentials hang off. */
let applicationId: number;
/** A second application with only a Sandbox credential, for the mint case. */
let sandboxOnlyId: number;
let sandbox: number;
let production: number;

beforeAll(async () => {
  await sweep();

  const [app, solo] = await db
    .insert(applications)
    .values([
      {
        productId: PRODUCT,
        name: NAME,
        scopes: ['payment:read' as const, 'invoice:read' as const],
      },
      {
        productId: PRODUCT,
        name: `${NAME} solo`,
        scopes: ['payment:read' as const],
      },
    ])
    .returning({ id: applications.id });

  applicationId = app!.id;
  sandboxOnlyId = solo!.id;

  const made = await db
    .insert(applicationCredentials)
    .values([
      credential(applicationId, 'test'),
      credential(applicationId, 'live'),
      credential(sandboxOnlyId, 'test'),
    ])
    .returning({
      id: applicationCredentials.id,
      applicationId: applicationCredentials.applicationId,
      mode: applicationCredentials.mode,
    });

  sandbox = made.find(
    (c) => c.applicationId === applicationId && c.mode === 'test',
  )!.id;
  production = made.find((c) => c.mode === 'live')!.id;
});

afterAll(sweep);

beforeEach(() => {
  reauthOk.mockClear();
});

async function sweep() {
  const stale = await db
    .select({ id: applications.id })
    .from(applications)
    .where(like(applications.name, 'Gate fixture gatetest-%'));

  if (stale.length === 0) return;

  // Credentials and domains cascade from the application.
  await db.delete(applications).where(
    inArray(
      applications.id,
      stale.map((r) => r.id),
    ),
  );
}

function credential(appId: number, mode: CredentialMode) {
  const clientId = `app_${mode}_${PRODUCT}_${marker}${appId}`;

  return {
    applicationId: appId,
    mode,
    clientId,
    secretHash: `$argon2id$not-a-real-hash$${clientId}`,
    secretLast4: 'aaaa',
    webhookSecret: `whsec_${clientId}`,
  };
}

/** An empty submission: no password, no code. What a Sandbox act needs. */
function form(fields: Record<string, string | number>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, String(value));
  }
  return data;
}

/** The same submission with credentials attached. `reauthenticate` is mocked. */
function confirmed(fields: Record<string, string | number>) {
  return form({ password: 'correct horse', code: '123456', ...fields });
}

async function row(id: number) {
  const [found] = await db
    .select({
      secretLast4: applicationCredentials.secretLast4,
      webhookSecret: applicationCredentials.webhookSecret,
      webhookUrl: applicationCredentials.webhookUrl,
      revokedAt: applicationCredentials.revokedAt,
    })
    .from(applicationCredentials)
    .where(eq(applicationCredentials.id, id))
    .limit(1);

  return found!;
}

async function scopesOf(id: number) {
  const [found] = await db
    .select({ scopes: applications.scopes })
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  return found!.scopes;
}

describe('a Sandbox credential is not gated', () => {
  it('rotates its client secret with no prompt', async () => {
    const result = await rotateSecretAction(
      undefined,
      form({ credentialId: sandbox }),
    );

    expect(result.ok).toBe(true);
    expect(result.secret).toBeTypeOf('string');
    expect(reauthOk).not.toHaveBeenCalled();
  });

  it('reveals its signing secret with no prompt', async () => {
    const result = await revealWebhookSecretAction(
      undefined,
      form({ credentialId: sandbox }),
    );

    expect(result.ok).toBe(true);
    expect(result.webhookSecret).toBeTypeOf('string');
    expect(reauthOk).not.toHaveBeenCalled();
  });

  it('rotates its signing secret with no prompt', async () => {
    const before = (await row(sandbox)).webhookSecret;

    const result = await rotateWebhookSecretAction(
      undefined,
      form({ credentialId: sandbox }),
    );

    expect(result.ok).toBe(true);
    expect((await row(sandbox)).webhookSecret).not.toBe(before);
    expect(reauthOk).not.toHaveBeenCalled();
  });

  it('is minted with no prompt', async () => {
    // The solo application already has Sandbox, so mint Production on it? No —
    // that is the gated case. Mint Sandbox on an application that has none.
    const [fresh] = await db
      .insert(applications)
      .values({
        productId: PRODUCT,
        name: `Gate fixture ${marker} fresh`,
        scopes: ['payment:read' as const],
      })
      .returning({ id: applications.id });

    const result = await addCredentialAction(
      undefined,
      form({ applicationId: fresh!.id, mode: 'test' }),
    );

    expect(result.ok).toBe(true);
    expect(result.secret).toBeTypeOf('string');
    expect(reauthOk).not.toHaveBeenCalled();
  });
});

describe('a Production credential is gated on every act', () => {
  it('refuses to rotate the client secret, and does not rotate it', async () => {
    const before = (await row(production)).secretLast4;

    const result = await rotateSecretAction(
      undefined,
      form({ credentialId: production }),
    );

    expect(result.ok).toBe(false);
    expect(result.secret).toBeUndefined();
    expect((await row(production)).secretLast4).toBe(before);
  });

  it('refuses to reveal the signing secret', async () => {
    const result = await revealWebhookSecretAction(
      undefined,
      form({ credentialId: production }),
    );

    expect(result.ok).toBe(false);
    expect(result.webhookSecret).toBeUndefined();
  });

  it('refuses to rotate the signing secret, and does not rotate it', async () => {
    const before = (await row(production)).webhookSecret;

    const result = await rotateWebhookSecretAction(
      undefined,
      form({ credentialId: production }),
    );

    expect(result.ok).toBe(false);
    expect((await row(production)).webhookSecret).toBe(before);
  });

  it('refuses to change the webhook URL, and does not change it', async () => {
    const before = (await row(production)).webhookUrl;

    const result = await setWebhookUrlAction(
      undefined,
      form({
        credentialId: production,
        webhookUrl: 'https://evil.example.com/hook',
      }),
    );

    expect(result.ok).toBe(false);
    expect((await row(production)).webhookUrl).toBe(before);
  });

  it('refuses to mint one without a password and code', async () => {
    const result = await addCredentialAction(
      undefined,
      form({ applicationId: sandboxOnlyId, mode: 'live' }),
    );

    expect(result.ok).toBe(false);
    expect(result.secret).toBeUndefined();
  });

  it('accepts the same act once the password and code are right', async () => {
    const before = (await row(production)).secretLast4;

    const result = await rotateSecretAction(
      undefined,
      confirmed({ credentialId: production }),
    );

    expect(result.ok).toBe(true);
    expect(reauthOk).toHaveBeenCalledOnce();
    expect((await row(production)).secretLast4).not.toBe(before);
  });

  it('writes an audit row when it refuses, naming the credential', async () => {
    await rotateSecretAction(undefined, form({ credentialId: production }));

    const [entry] = await db
      .select({
        resourceId: auditLogs.resourceId,
        afterState: auditLogs.afterState,
      })
      .from(auditLogs)
      .where(eq(auditLogs.action, 'application.reauth_failed'))
      .orderBy(desc(auditLogs.id))
      .limit(1);

    expect(entry?.resourceId).toBe(String(production));
    // An empty submission is the shape a script makes; a wrong password is the
    // shape a person makes. Both are recorded, and they are told apart.
    expect(entry?.afterState).toMatchObject({ reason: 'reauth_missing' });
  });
});

describe('scopes are gated by the application, because both credentials share them', () => {
  it('refuses on an application that has a Production credential', async () => {
    const before = await scopesOf(applicationId);

    const result = await updateApplicationAction(
      undefined,
      form({ applicationId, scopes: 'payment:read' }),
    );

    expect(result.ok).toBe(false);
    expect(await scopesOf(applicationId)).toEqual(before);
  });

  it('proceeds on an application that has only Sandbox', async () => {
    const result = await updateApplicationAction(
      undefined,
      form({ applicationId: sandboxOnlyId, scopes: 'invoice:read' }),
    );

    expect(result.ok).toBe(true);
    expect(await scopesOf(sandboxOnlyId)).toEqual(['invoice:read']);
    expect(reauthOk).not.toHaveBeenCalled();
  });
});

describe('revoking asks for the name, whatever the mode', () => {
  it('refuses a Sandbox revoke when the name is not typed', async () => {
    const result = await revokeCredentialAction(
      undefined,
      form({ credentialId: sandbox }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.confirmName).toContain(NAME);
    expect((await row(sandbox)).revokedAt).toBeNull();
  });

  it('refuses a Production revoke with the right name but no password', async () => {
    const result = await revokeCredentialAction(
      undefined,
      form({ credentialId: production, confirmName: NAME }),
    );

    expect(result.ok).toBe(false);
    expect((await row(production)).revokedAt).toBeNull();
  });

  it('revokes Sandbox once the name matches, and leaves Production alone', async () => {
    const result = await revokeCredentialAction(
      undefined,
      form({ credentialId: sandbox, confirmName: NAME }),
    );

    expect(result.ok).toBe(true);
    expect(reauthOk).not.toHaveBeenCalled();
    expect((await row(sandbox)).revokedAt).not.toBeNull();

    // The point of the split: one credential dying does not take the other.
    expect((await row(production)).revokedAt).toBeNull();
  });

  it('revokes Production with the name and the code', async () => {
    const result = await revokeCredentialAction(
      undefined,
      confirmed({ credentialId: production, confirmName: NAME }),
    );

    expect(result.ok).toBe(true);
    expect(reauthOk).toHaveBeenCalledOnce();
    expect((await row(production)).revokedAt).not.toBeNull();
  });
});

/**
 * Registration mints Sandbox. There is no way to ask it for anything else.
 *
 * The form no longer draws a mode control, which is the visible half of item
 * 8. The half worth a test is the other one: this action is reachable by
 * anyone who can post to it, so "the form does not send it" is not a
 * guarantee. If the mode were read from the request at all — even with a
 * sensible default — a hand-rolled `isLive=true` would mint a Production
 * credential through the one path that asks for no password and no code.
 *
 * So the assertion is on the row, not on the response: whatever the form
 * says, what lands in the database is `test`.
 */
describe('registration mints a Sandbox credential', () => {
  it('ignores isLive=true and mints test anyway', async () => {
    const name = `Gate fixture ${marker} register`;

    const result = await registerApplicationAction(
      undefined,
      form({
        productId: PRODUCT,
        name,
        domains: 'sandbox.example.com',
        scopes: 'payment:read',
        // The field the old form sent, forged by hand.
        isLive: 'true',
      }),
    );

    expect(result.ok).toBe(true);

    const [row] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.name, name))
      .limit(1);

    expect(row).toBeDefined();

    const creds = await db
      .select({
        mode: applicationCredentials.mode,
        clientId: applicationCredentials.clientId,
      })
      .from(applicationCredentials)
      .where(eq(applicationCredentials.applicationId, row!.id));

    expect(creds).toHaveLength(1);
    expect(creds[0]!.mode).toBe('test');
    expect(creds[0]!.clientId.startsWith('app_test_')).toBe(true);
  });

  it('asks for no password or code, so no reauth is attempted', async () => {
    reauthOk.mockClear();

    const name = `Gate fixture ${marker} register2`;

    const result = await registerApplicationAction(
      undefined,
      form({
        productId: PRODUCT,
        name,
        domains: 'sandbox2.example.com',
        scopes: 'payment:read',
      }),
    );

    expect(result.ok).toBe(true);
    expect(reauthOk).not.toHaveBeenCalled();
  });
});
