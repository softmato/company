import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';

/**
 * `sample-brief.pdf` on the portal demo: the brief the sample client "shared",
 * so the demo's download button hands over a real file. Labelled a sample on
 * the page itself; the shop is the invented `himalayan-tea` preview.
 */
const SECTIONS: { heading: string; lines: string[] }[] = [
  {
    heading: 'About us',
    lines: [
      'We sell loose-leaf tea from our own gardens to shoppers across Nepal, and in bulk to cafés, hotels and shops.',
    ],
  },
  {
    heading: 'What we need',
    lines: [
      '• An online shop for retail customers: catalogue, basket and checkout.',
      '• A private ordering page for wholesale buyers, with their own price list.',
      '• Stock levels that wholesale buyers can see before they order.',
      '• Online payment, with a receipt for every order.',
    ],
  },
  {
    heading: 'Pages',
    lines: ['Home · Shop · Product · Our gardens · Wholesale · Contact'],
  },
  {
    heading: 'Who will use it',
    lines: [
      '• Retail shoppers, mostly on their phones.',
      '• Wholesale buyers placing the same order every month.',
      '• Our own team, updating products, prices and stock.',
    ],
  },
  {
    heading: 'Timing',
    lines: ['We would like to launch before the festival season.'],
  },
];

const INK = rgb(0.08, 0.1, 0.09);
const MUTED = rgb(0.42, 0.45, 0.44);
const EMERALD = rgb(0.06, 0.6, 0.42);

/** Greedy word wrap to `width` points. */
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function sampleBriefPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Project brief — Himalayan Tea Co. (sample)');
  pdf.setProducer('Softmato');

  const [regular, bold] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
  ]);

  const page = pdf.addPage([595.28, 841.89]);
  const left = 56;
  const width = page.getWidth() - left * 2;
  let y = page.getHeight() - 72;

  page.drawRectangle({
    x: left,
    y: y + 18,
    width: 40,
    height: 4,
    color: EMERALD,
  });
  page.drawText('Project brief', {
    x: left,
    y: y - 12,
    size: 26,
    font: bold,
    color: INK,
  });
  y -= 36;
  page.drawText('Himalayan Tea Co. · Online shop and wholesale ordering', {
    x: left,
    y,
    size: 12,
    font: regular,
    color: MUTED,
  });
  y -= 44;

  for (const { heading, lines } of SECTIONS) {
    page.drawText(heading, { x: left, y, size: 13, font: bold, color: INK });
    y -= 20;
    for (const text of lines) {
      for (const line of wrap(text, regular, 11, width)) {
        page.drawText(line, {
          x: left,
          y,
          size: 11,
          font: regular,
          color: INK,
        });
        y -= 16;
      }
      y -= 2;
    }
    y -= 16;
  }

  page.drawText('Sent by Asha', {
    x: left,
    y,
    size: 11,
    font: regular,
    color: INK,
  });

  page.drawText(
    'Sample document from the Softmato client portal demo · softmato.com/client-portal',
    { x: left, y: 40, size: 8.5, font: regular, color: MUTED },
  );

  return pdf.save();
}
