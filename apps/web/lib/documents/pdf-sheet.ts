/**
 * The paper a PDF document is drawn on: A4, the house inks, the four standard
 * faces, and a cursor that writes top-down.
 *
 * **Standard faces, not embedded ones.** Helvetica carries the words and
 * Courier carries every figure and identifier — the same split the screen
 * makes between Inter and IBM Plex Mono, for the same reason: amounts align on
 * the decimal point and a document number reads back one character at a time.
 * The standard faces need no font file and no bytes, and every PDF reader has
 * them, so there is nothing to download and nothing to arrive late.
 *
 * **Their alphabet is WinAnsi (Latin-1 plus typography).** Text outside it —
 * a customer named in Devanagari — cannot be drawn. That is refused loudly
 * (`UndrawableText`), never replaced with question marks: a statutory document
 * with a garbled name on it is worse than no PDF, and the caller's contract
 * already has the honest answer, which is to serve the HTML instead.
 *
 * pdf-lib places everything from the bottom-left in absolute points. This
 * holds a `y` that only decreases, so a document is written in reading order
 * and a block moves by moving its call.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';

import type { DocumentStatus } from './types';

export const PAGE = { height: 841.89, width: 595.28 } as const;
export const MARGIN = { bottom: 58, left: 48, right: 48, top: 50 } as const;
export const RIGHT = PAGE.width - MARGIN.right;

const hex = (value: string): RGB =>
  rgb(
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
  );

/** `components/documents/sheet-styles.ts`, as RGB. */
export const INK = {
  text: hex('#111514'),
  soft: hex('#5b6a64'),
  faint: hex('#8a9691'),
  rule: hex('#d9e0dc'),
  strong: hex('#111514'),
  band: hex('#f6f8f7'),
} as const;

/** The badge colours, same file. */
export const STATUS_INK: Record<DocumentStatus, RGB> = {
  unpaid: hex('#a16207'),
  partially_paid: hex('#1d4ed8'),
  paid: hex('#047857'),
  past_due: hex('#a81e12'),
  void: hex('#6b7280'),
  written_off: hex('#6b7280'),
};

export type Face = 'sans' | 'bold' | 'mono' | 'monoBold';

export type Run = {
  color?: RGB;
  face?: Face;
  size?: number;
  /** Extra points between letters. One draw call per glyph, so titles only. */
  tracking?: number;
};

export class UndrawableText extends Error {
  constructor(text: string) {
    super(
      `The PDF fonts cannot draw "${text.slice(0, 40)}" (characters outside ` +
        'Latin-1), so this document is served as HTML instead.',
    );
  }
}

/**
 * The page's typography, in characters WinAnsi has. The screen may use a true
 * minus or an arrow; the PDF says the same thing in ASCII rather than failing.
 */
const PLAIN: Record<string, string> = {
  '−': '-', // minus sign
  '→': 'to', // arrow
  ' ': ' ', // no-break space
  ' ': ' ', // thin space
  ' ': ' ', // narrow no-break space (Intl's time format)
  '₹': 'Rs', // rupee sign
};

export function plain(text: string): string {
  return text
    .replace(/[−→   ₹]/g, (c) => PLAIN[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim();
}

export class Sheet {
  y = PAGE.height - MARGIN.top;
  page: PDFPage;
  private readonly drawable: Set<number>;

  private constructor(
    readonly pdf: PDFDocument,
    private readonly fonts: Record<Face, PDFFont>,
  ) {
    this.page = pdf.addPage([PAGE.width, PAGE.height]);
    this.drawable = new Set(fonts.sans.getCharacterSet());
  }

  static async open(title: string): Promise<Sheet> {
    const pdf = await PDFDocument.create();

    pdf.setTitle(title);
    pdf.setCreator('Softmato');
    pdf.setProducer('Softmato');

    const [sans, bold, mono, monoBold] = await Promise.all([
      pdf.embedFont(StandardFonts.Helvetica),
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedFont(StandardFonts.Courier),
      pdf.embedFont(StandardFonts.CourierBold),
    ]);

    return new Sheet(pdf, { bold, mono, monoBold, sans });
  }

  /** Every measure and every draw goes through here, so nothing reaches the font it cannot encode. */
  private safe(raw: string): string {
    const value = plain(raw);

    for (const char of value) {
      if (!this.drawable.has(char.codePointAt(0) ?? 0)) throw new UndrawableText(value);
    }

    return value;
  }

  width(raw: string, run: Run = {}): number {
    const text = this.safe(raw);
    const font = this.fonts[run.face ?? 'sans'];
    const size = run.size ?? 9;

    return font.widthOfTextAtSize(text, size) + (run.tracking ?? 0) * Math.max(0, text.length - 1);
  }

  /** One run at `x` on the current line. Does not advance; returns its width. */
  text(x: number, raw: string, run: Run = {}): number {
    const value = this.safe(raw);
    const font = this.fonts[run.face ?? 'sans'];
    const size = run.size ?? 9;
    const color = run.color ?? INK.text;

    if (!run.tracking) {
      this.page.drawText(value, { color, font, size, x, y: this.y });
    } else {
      let pen = x;

      for (const glyph of value) {
        this.page.drawText(glyph, { color, font, size, x: pen, y: this.y });
        pen += font.widthOfTextAtSize(glyph, size) + run.tracking;
      }
    }

    return this.width(value, run);
  }

  /** A run whose right edge sits at `right`. */
  right(right: number, raw: string, run: Run = {}): number {
    const value = this.safe(raw);

    return this.text(right - this.width(value, run), value, run);
  }

  down(points: number): this {
    this.y -= points;

    return this;
  }

  /** Starts a fresh page when fewer than `height` points are left on this one. */
  ensure(height: number, onNewPage?: () => void): this {
    if (this.y - height >= MARGIN.bottom) return this;

    this.page = this.pdf.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - MARGIN.top;
    onNewPage?.();

    return this;
  }

  /** Greedy word wrap. A word wider than the column is left to overhang rather than split. */
  wrap(raw: string, width: number, run: Run = {}): string[] {
    const lines: string[] = [];
    let current = '';

    for (const word of this.safe(raw).split(' ')) {
      const candidate = current ? `${current} ${word}` : word;

      if (current && this.width(candidate, run) > width) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }

    if (current) lines.push(current);

    return lines;
  }

  /** Wrapped lines from `x`, advancing past each. */
  paragraph(x: number, raw: string, width: number, run: Run = {}, leading = (run.size ?? 9) + 4): this {
    for (const line of this.wrap(raw, width, run)) {
      this.ensure(leading);
      this.text(x, line, run);
      this.down(leading);
    }

    return this;
  }

  rule(options: { color?: RGB; from?: number; thickness?: number; to?: number } = {}): this {
    this.page.drawLine({
      color: options.color ?? INK.rule,
      end: { x: options.to ?? RIGHT, y: this.y },
      start: { x: options.from ?? MARGIN.left, y: this.y },
      thickness: options.thickness ?? 0.6,
    });

    return this;
  }

  /** `BILL TO` — small, tracked, muted caps. */
  eyebrow(x: number, value: string): this {
    this.text(x, value.toUpperCase(), { color: INK.faint, size: 6.8, tracking: 1.2 });

    return this.down(12);
  }

  /**
   * An outlined stamp — `PAID`, `PART PAYMENT` — its top-left at `(x, top)`.
   * Outline, not fill, as on the screen: this is paper, and a border is what a
   * rubber stamp leaves.
   */
  stamp(x: number, top: number, value: string, color: RGB): { height: number; width: number } {
    const label = value.toUpperCase();
    const run: Run = { color, face: 'bold', size: 9, tracking: 1.4 };
    const width = this.width(label, run) + 30;
    const height = 24;

    this.page.drawRectangle({
      borderColor: color,
      borderWidth: 1.2,
      height,
      // pdf-lib fills black unless told otherwise.
      opacity: 0,
      width,
      x,
      y: top - height,
    });

    const saved = this.y;

    this.y = top - height / 2 - 3.2;
    this.text(x + 15, label, run);
    this.y = saved;

    return { height, width };
  }

  /** A band of the page's tint behind the next `height` points. */
  band(height: number, from = MARGIN.left, to = RIGHT): void {
    this.page.drawRectangle({ color: INK.band, height, width: to - from, x: from, y: this.y - height });
  }

  /** The same footer on every page, then the bytes. */
  async save(left: string, right: string): Promise<Uint8Array> {
    const pages = this.pdf.getPages();

    pages.forEach((page, index) => {
      this.page = page;
      this.y = MARGIN.bottom - 22;
      this.rule({ color: INK.rule }).down(0);
      this.y = MARGIN.bottom - 34;
      this.text(MARGIN.left, left, { color: INK.faint, size: 7 });
      this.right(RIGHT, right, { color: INK.faint, face: 'mono', size: 7 });

      if (pages.length > 1) {
        const mark = `Page ${index + 1} of ${pages.length}`;

        this.text((PAGE.width - this.width(mark, { size: 7 })) / 2, mark, { color: INK.faint, size: 7 });
      }
    });

    return this.pdf.save();
  }
}
