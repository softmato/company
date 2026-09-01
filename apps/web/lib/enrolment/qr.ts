import 'server-only';

/**
 * Renders a URI as an inline SVG — an `otpauth://` secret, or an `/enrol` link
 * carrying a one-time token.
 *
 * Server-side and inline on purpose. Both URIs are bearer credentials, so
 * neither may become an image `src` — that would put a live secret into a URL,
 * where it reaches the access log, the browser history and any referrer.
 *
 * Error correction stays at the default M. A QR is read once, from a screen,
 * at arm's length; higher correction only makes the modules smaller.
 */
import QRCode from 'qrcode';

export async function qrSvg(uri: string): Promise<string> {
  return QRCode.toString(uri, {
    type: 'svg',
    margin: 1,
    // Rendered at a fixed CSS size; this is the intrinsic module scale.
    width: 232,
    color: {
      // Matches --foreground / --background rather than pure black on white,
      // so the code sits on the page instead of punching a hole in it.
      dark: '#1c1917',
      light: '#ffffff',
    },
  });
}
