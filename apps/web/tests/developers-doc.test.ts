import { describe, expect, it } from 'vitest';

import { extractHeadings } from '@/lib/cms/headings';
import { integrationDoc } from '@/lib/developers/integration-doc';

/**
 * `/developers` renders a markdown file from the repository at build time, so
 * the failure mode is not a runtime error — it is a page that builds fine and
 * says the wrong thing, or a page whose contents-rail is empty because a
 * heading level changed. Both are only caught here.
 */
describe('integrationDoc', () => {
  const doc = integrationDoc();

  it('finds the file and strips the H1 that PageHeader renders', () => {
    expect(doc.title).toBe('Integrating with Softmato Payments');
    expect(doc.body).not.toMatch(/^#\s/m);
    expect(doc.body.length).toBeGreaterThan(1000);
  });

  /**
   * `[`API.md`](./API.md)` is a working link in the repository and a 404 on the
   * web. A documentation page whose first link is dead does not get a second
   * chance with the reader.
   */
  it('removes links to sibling repository files, keeping their text', () => {
    expect(doc.body).not.toMatch(/\]\(\.\//);
    expect(doc.body).toContain('API.md');
  });

  /**
   * The page is reachable by anyone, and the reader it can most easily mislead
   * is an outside developer looking for a sign-up button. Saying plainly who
   * it is for is the whole job of the first section, so it is worth a test.
   */
  it('says who it is for, and points outsiders somewhere useful', () => {
    const flat = doc.body.replace(/\s+/g, ' ');

    expect(flat).toMatch(/Who this is for/);
    expect(flat).toMatch(/not a self-service API/i);
    expect(flat).toMatch(/not currently open to third-party integrations/i);
    // An outside reader is given a route in, not just a closed door.
    expect(flat).toContain('(/contact)');
  });

  it('has headings for the contents rail', () => {
    const headings = extractHeadings(doc.body);

    expect(headings.length).toBeGreaterThan(5);
    expect(headings.map((heading) => heading.id)).toContain(
      '6-connecting-securely',
    );
  });

  /**
   * The guide tells a product team to import `@softmato/sdk`, and that package
   * is published privately to GitHub Packages — `pnpm add` alone 404s. Naming
   * a dependency without saying how to obtain it is the gap this asserts is
   * closed.
   */
  it('says how to actually obtain the SDK it tells you to import', () => {
    const flat = doc.body.replace(/\s+/g, ' ');

    expect(extractHeadings(doc.body).map((h) => h.id)).toContain(
      'installing-the-sdk',
    );
    expect(flat).toContain('npm.pkg.github.com');
    expect(flat).toContain('read:packages');
    expect(flat).toContain('pnpm add @softmato/sdk');
    // The two failures that look alike and are not.
    expect(flat).toMatch(/401/);
    expect(flat).toMatch(/404/);
  });
});

/**
 * The security section is the reason this page exists at all. Each assertion
 * below is a rule enforced in code — if one is ever relaxed, the documentation
 * saying otherwise is worse than no documentation.
 */
describe('the "Connecting securely" section', () => {
  /*
   * Newlines collapsed before matching. The source is hard-wrapped at 80
   * columns, so every sentence worth asserting on spans a line break — and a
   * test that fails when a paragraph is rewrapped is a test that will be
   * deleted rather than fixed.
   */
  const body = integrationDoc().body.replace(/\s+/g, ' ');

  it('tells an integrator the secret is server-side only', () => {
    expect(body).toMatch(/server-side/i);
    expect(body).toMatch(/never in a browser bundle/i);
  });

  it('states the registered-domain rule and that matching is exact', () => {
    expect(body).toMatch(/registered/i);
    expect(body).toContain('evilquestioncall.com');
    expect(body).toMatch(/no wildcards/i);
  });

  it('says to verify the signature before reading any field', () => {
    expect(body).toMatch(/before you parse the body/i);
  });

  it('forbids provisioning on a return URL or an invoice', () => {
    expect(body).toMatch(/an invoice is a request for money, not money/i);
    expect(body).toMatch(/There is no payment status in it/i);
  });

  it('documents both the 429 and the rotation overlap', () => {
    expect(body).toContain('429');
    expect(body).toMatch(/24 hours/);
  });
});
