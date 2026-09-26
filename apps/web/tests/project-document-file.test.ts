/**
 * What a client may upload, decided by bytes; and that photos lose their
 * metadata before they are stored (docs/RULES.md §6).
 */
import { describe, expect, test } from 'vitest';

import {
  detectDocument,
  safeFileName,
  stripMetadata,
} from '@/lib/projects/document-file';

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

describe('detectDocument', () => {
  test('a PDF is a PDF whatever it is called', () => {
    const pdf = bytes(...ascii('%PDF-1.7\n'));
    expect(detectDocument(pdf, 'photo.png')?.contentType).toBe(
      'application/pdf',
    );
  });

  test('a zip named .docx is a Word file; any other zip stays a zip', () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04, 0, 0);
    expect(detectDocument(zip, 'Brief.DOCX')?.extension).toBe('docx');
    expect(detectDocument(zip, 'assets.zip')?.contentType).toBe(
      'application/zip',
    );
    expect(detectDocument(zip, 'invoice.pdf')?.contentType).toBe(
      'application/zip',
    );
  });

  test('HTML renamed to .pdf is refused', () => {
    expect(
      detectDocument(bytes(...ascii('<html><script>')), 'x.pdf'),
    ).toBeNull();
  });
});

describe('stripMetadata', () => {
  test('drops JPEG APP1 (EXIF) and keeps everything else in order', () => {
    const app0 = [0xff, 0xe0, 0x00, 0x04, 0xaa, 0xbb];
    const exif = [0xff, 0xe1, 0x00, 0x08, ...ascii('Exif'), 0x00, 0x00];
    const scan = [0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9];
    const jpeg = bytes(0xff, 0xd8, ...app0, ...exif, ...scan);

    expect([...stripMetadata(jpeg, 'image/jpeg')]).toEqual([
      0xff,
      0xd8,
      ...app0,
      ...scan,
    ]);
  });

  test('drops PNG text and eXIf chunks, keeps image chunks', () => {
    const chunk = (type: string, data: number[]) => [
      0,
      0,
      0,
      data.length,
      ...ascii(type),
      ...data,
      1,
      2,
      3,
      4,
    ];
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = chunk('IHDR', [9, 9]);
    const idat = chunk('IDAT', [7]);
    const iend = chunk('IEND', []);
    const png = bytes(
      ...signature,
      ...ihdr,
      ...chunk('tEXt', ascii('GPS')),
      ...chunk('eXIf', [1]),
      ...idat,
      ...iend,
    );

    expect([...stripMetadata(png, 'image/png')]).toEqual([
      ...signature,
      ...ihdr,
      ...idat,
      ...iend,
    ]);
  });

  test('a truncated JPEG comes back untouched rather than mangled', () => {
    const broken = bytes(0xff, 0xd8, 0xff, 0xe1, 0x40, 0x00, 0x01);
    expect(stripMetadata(broken, 'image/jpeg')).toBe(broken);
  });
});

describe('safeFileName', () => {
  test('keeps a readable name and the detected extension', () => {
    expect(safeFileName('Q3 report (final).exe', 'pdf')).toBe(
      'Q3 report (final).pdf',
    );
  });

  test('nothing can break out of the header quote', () => {
    expect(safeFileName('a"; filename="evil.html', 'pdf')).not.toContain('"');
    expect(safeFileName('\r\n', 'zip')).toBe('document.zip');
  });
});
