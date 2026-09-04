/**
 * The re-authentication gate on `/admin/applications`, against real Postgres.
 *
 * The rule under test is one sentence — **the gate follows the mode, not the
 * verb** — and it is worth a test because the previous arrangement looked
 * reasonable while being backwards. Revealing a Sandbox signing secret cost a
 * password and a TOTP code; rotating a client secret, which kills a live
 * integration in 24 hours, and revoking an application, which kills one
 * instantly and permanently, cost nothing at all.
 *
 * So every one of the six actions is exercised twice: once against a Sandbox
 * credential, where it must proceed with an empty form, and once against a
 * Production credential, where the same empty form must change nothing.
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

import { applications, auditLogs, db } from '@softmato/db';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

vi.mock('@/app/(admin)/admin/cms/actions/shared', () => ({
  requireAdmin: async () => ADMIN_ID,
}));

const reauthOk = vi.fn(async () => ({ ok: true, totpSecret: 'x' }) as const);

vi.mock('@/app/(admin)/admin/security/reauth', () => ({
  reauthenticate: (...args: unknown[]) => reauthOk(...(args as [])),
}));

const {
  revealWebhookSecretAction,
  revokeApplicationAction,
  rotateSecretAction,
  rotateWebhookSecretAction,
  updateApplicationAction,
} = await import('@/app/(admin)/admin/applications/actions');

const ADMIN_ID = '1';
const PRODUCT = 'hostelhub';
const marker = `gatetest-${Date.now()}`;

let sandbox: number;
let production: number;

const NAMES: Record<number, string> = {};

beforeAll(async () => {
  await sweep();

  const rows = await db
    .insert(applications)
    .values([
      seed(`app_test_${marker}`, `Gate fixture sandbox ${marker}`, false),
      seed(`app_live_${marker}`, `Gate fixture production ${marker}`, true),
    ])
    .returning({
      id: applications.id,
      name: applications.name,
      isLive: applications.isLive,
    });

  sandbox = rows.find((r) => !r.isLive)!.id;
  production = rows.find((r) => r.isLive)!.id;

  for (const row of rows) NAMES[row.id] = row.name;
});

afterAll(sweep);

beforeEach(() => {
  reauthOk.mockClear();
});

async function sweep() {
  const stale = await db
    .select({ id: applications.id })
    .from(applications)
    .where(like(applications.clientId, 'app_%_gatetest-%'));

  if (stale.length === 0) return;

  await db.delete(applications).where(
    inArray(
      applications.id,
      stale.map((r) => r.id),
    ),
  );
}

function seed(clientId: string, name: string, isLive: boolean) {
  return {
    productId: PRODUCT,
    name,
    clientId,
    secretHash: `$argon2id$not-a-real-hash$${clientId}`,
    secretLast4: 'aaaa',
    scopes: ['payment:read' as const, 'invoice:read' as const],
    webhookSecret: `whsec_${clientId}`,
    isLive,
  };
}

/** An empty submission: no password, no code. What a Sandbox act needs. */
function form(applicationId: number, extra: Record<string, string> = {}) {
  const data = new FormData();
  data.set('applicationId', String(applicationId));
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
}

/** The same submission with credentials attached. `reauthenticate` is mocked. */
function confirmed(applicationId: number, extra: Record<string, string> = {}) {
  return form(applicationId, {
    password: 'correct horse',
    code: '123456',
    ...extra,
  });
}

async function row(id: number) {
  const [found] = await db
    .select({
      secretLast4: applications.secretLast4,
      webhookSecret: applications.webhookSecret,
      scopes: applications.scopes,
      webhookUrl: applications.webhookUrl,
      revokedAt: applications.revokedAt,
      isActive: applications.isActive,
    })
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  return found!;
}

describe('a Sandbox credential is not gated', () => {
  it('rotates its client secret with no prompt', async () => {
    const result = await rotateSecretAction(undefined, form(sandbox));

    expect(result.ok).toBe(true);
    expect(result.secret).toBeTypeOf('string');
    expect(reauthOk).not.toHaveBeenCalled();
  });

  it('reveals its signing secret with no prompt', async () => {
    const result = await revealWebhookSecretAction(undefined, form(sandbox));

    expect(result.ok).toBe(true);
    expect(result.webhookSecret).toBeTypeOf('string');
    expect(reauthOk).not.toHaveBeenCalled();
  });

  it('rotates its signing secret with no prompt', async () => {
    const before = (await row(sandbox)).webhookSecret;

    const result = await rotateWebhookSecretAction(undefined, form(sandbox));

    expect(result.ok).toBe(true);
    expect((await row(sandbox)).webhookSecret).not.toBe(before);
    expect(reauthOk).not.toHaveBeenCalled();
  });

  it('changes its scopes with no prompt', async () => {
    const result = await updateApplicationAction(
      undefined,
      form(sandbox, { scopes: 'payment:read', webhookUrl: '' }),
    );

    expect(result.ok).toBe(true);
    expect((await row(sandbox)).scopes).toEqual(['payment:read']);
    expect(reauthOk).not.toHaveBeenCalled();
  });
});

describe('a Production credential is gated on every act', () => {
  it('refuses to rotate the client secret, and does not rotate it', async () => {
    const before = (await row(production)).secretLast4;

    const result = await rotateSecretAction(undefined, form(production));

    expect(result.ok).toBe(false);
    expect(result.secret).toBeUndefined();
    expect((await row(production)).secretLast4).toBe(before);
  });

  it('refuses to reveal the signing secret', async () => {
    const result = await revealWebhookSecretAction(undefined, form(production));

    expect(result.ok).toBe(false);
    expect(result.webhookSecret).toBeUndefined();
  });

  it('refuses to rotate the signing secret, and does not rotate it', async () => {
    const before = (await row(production)).webhookSecret;

    const result = await rotateWebhookSecretAction(undefined, form(production));

    expect(result.ok).toBe(false);
    expect((await row(production)).webhookSecret).toBe(before);
  });

  it('refuses to change the scopes, and does not change them', async () => {
    const before = (await row(production)).scopes;

    const result = await updateApplicationAction(
      undefined,
      form(production, { scopes: 'payment:read', webhookUrl: '' }),
    );

    expect(result.ok).toBe(false);
    expect((await row(production)).scopes).toEqual(before);
  });

  it('accepts the same act once the password and code are right', async () => {
    const before = (await row(production)).secretLast4;

    const result = await rotateSecretAction(undefined, confirmed(production));

    expect(result.ok).toBe(true);
    expect(reauthOk).toHaveBeenCalledOnce();
    expect((await row(production)).secretLast4).not.toBe(before);
  });

  it('writes an audit row when it refuses, naming the application', async () => {
    await rotateSecretAction(undefined, form(production));

    const [entry] = await db
      .select({
        action: auditLogs.action,
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

describe('revoking asks for the name, whatever the mode', () => {
  it('refuses a Sandbox revoke when the name is not typed', async () => {
    const result = await revokeApplicationAction(undefined, form(sandbox));

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.confirmName).toContain(NAMES[sandbox]);
    expect((await row(sandbox)).revokedAt).toBeNull();
  });

  it('refuses a Production revoke with the right name but no password', async () => {
    const result = await revokeApplicationAction(
      undefined,
      form(production, { confirmName: NAMES[production]! }),
    );

    expect(result.ok).toBe(false);
    expect((await row(production)).revokedAt).toBeNull();
  });

  it('revokes a Sandbox credential once the name matches, with no password', async () => {
    const result = await revokeApplicationAction(
      undefined,
      form(sandbox, { confirmName: NAMES[sandbox]! }),
    );

    expect(result.ok).toBe(true);
    expect(reauthOk).not.toHaveBeenCalled();

    const after = await row(sandbox);
    expect(after.revokedAt).not.toBeNull();
    expect(after.isActive).toBe(false);
  });

  it('revokes a Production credential with the name and the code', async () => {
    const result = await revokeApplicationAction(
      undefined,
      confirmed(production, { confirmName: NAMES[production]! }),
    );

    expect(result.ok).toBe(true);
    expect(reauthOk).toHaveBeenCalledOnce();
    expect((await row(production)).revokedAt).not.toBeNull();
  });
});
