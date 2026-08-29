import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/seo/site';

/**
 * The default social card.
 *
 * Every page with no image of its own falls back to this, which is most of
 * them — a services page and a policy have no photograph and should not be
 * given a stock one. Without it a shared link comes out as a bare blue
 * underline, which is the difference between a link someone clicks and one
 * they scroll past.
 *
 * **Light ground, not dark.** The whole product is light (the founder's call
 * on 2026-08-28), and the lockup is drawn dark-on-white, so a near-white card
 * is both on-brand and the one background the logo is guaranteed to sit on
 * cleanly whether or not its master has a transparent background.
 *
 * 1200×630 is the size Facebook, LinkedIn and X all crop from; anything
 * smaller gets upscaled and anything squarer gets cut. `alt` is not decorative
 * here — it is read aloud when the card is shared into a thread.
 *
 * If `logo.png` has not been saved into `public/brand/` yet, the card renders
 * its text half and says so in the logo's place rather than throwing. A build
 * that fails because an image is missing takes the whole site down; a card
 * that is merely plain does not.
 */
export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/* From globals.css, light theme. Kept literal: next/og resolves no CSS vars. */
const BACKGROUND = '#fbfdfc';
const FOREGROUND = '#06140f';
const MUTED = '#55665d';
const PRIMARY = '#047857';
const BORDER = '#dee8e2';

/**
 * The lockup as a data URI, or null when no master has been saved yet.
 *
 * `logo-og.png` first: it is the master with its white canvas keyed out and
 * the empty border trimmed away (`pnpm brand:build`), so it sits on the card's
 * near-white ground instead of reading as a white box pasted onto it. The
 * untrimmed master is the fallback, and text is the fallback after that — a
 * build must not fail because an image is missing.
 */
async function logoDataUri(): Promise<string | null> {
  const brand = path.join(process.cwd(), 'public', 'brand');

  for (const name of ['logo-og.png', 'logo.png']) {
    try {
      const bytes = await readFile(path.join(brand, name));
      return `data:image/png;base64,${bytes.toString('base64')}`;
    } catch {
      /* Try the next one. */
    }
  }

  return null;
}

export default async function OpengraphImage() {
  const logo = await logoDataUri();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BACKGROUND,
        padding: '72px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      {/*
          The bloom the marketing pages open on, flattened to one radial
          gradient. Off the top-right corner, so the headline underneath keeps
          its contrast against the near-white ground.
        */}
      <div
        style={{
          position: 'absolute',
          top: '-340px',
          right: '-240px',
          width: '900px',
          height: '900px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${PRIMARY}1f 0%, ${BACKGROUND}00 70%)`,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/og has no Image
          <img src={logo} alt="" height={150} style={{ height: '150px' }} />
        ) : (
          <div
            style={{
              display: 'flex',
              fontSize: '40px',
              color: FOREGROUND,
              letterSpacing: '-0.02em',
            }}
          >
            softmato
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: '72px',
            lineHeight: 1.08,
            color: FOREGROUND,
            letterSpacing: '-0.03em',
            maxWidth: '940px',
          }}
        >
          Software products and project work, built in Nepal.
        </div>
        <div
          style={{
            marginTop: '26px',
            fontSize: '29px',
            lineHeight: 1.35,
            color: MUTED,
            letterSpacing: '-0.01em',
            maxWidth: '880px',
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${BORDER}`,
          paddingTop: '26px',
          fontSize: '24px',
          color: MUTED,
        }}
      >
        <div style={{ display: 'flex' }}>softmato.com</div>
        <div style={{ display: 'flex', color: PRIMARY }}>
          Softmato Technology Pvt Ltd
        </div>
      </div>
    </div>,
    size,
  );
}
