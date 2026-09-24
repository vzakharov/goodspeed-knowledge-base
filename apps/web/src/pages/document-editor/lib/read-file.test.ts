import { DOCUMENT_LIMITS } from '@kb/contracts';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { readDocumentFile, UNSUPPORTED_FILE } from './read-file';

/**
 * A one-page PDF whose page draws `stream`, in Helvetica: the smallest file
 * pdf.js reads as a real document, byte offsets and all.
 */
function pdf(stream: string): Uint8Array<ArrayBuffer> {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let file = '%PDF-1.4\n';
  const offsets = objects.map((body, index) => {
    const offset = file.length;
    file += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = file.length;
  file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  file += offsets
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  file += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(file);
}

const file = (name: string, content: BlobPart, type = '') =>
  new File([content], name, { type });

describe('readDocumentFile', () => {
  before(async () => {
    // Under Node pdf.js runs its worker in-process, loaded from this path; a
    // browser gets the bundled worker the module wires itself.
    const { GlobalWorkerOptions } =
      await import('pdfjs-dist/legacy/build/pdf.mjs');
    GlobalWorkerOptions.workerSrc = import.meta
      .resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  });

  it('reads a PDF into paragraphs, mending a broken word', async () => {
    const page = pdf(
      'BT /F1 12 Tf 72 720 Td (A first exam-) Tj 0 -14 Td (ple of text.) Tj 0 -40 Td (Second paragraph.) Tj ET',
    );
    assert.equal(
      await readDocumentFile(file('paper.pdf', page, 'application/pdf')),
      'A first example\nof text.\n\nSecond paragraph.',
    );
  });

  it('refuses a PDF with no text, as a scan is', async () => {
    await assert.rejects(readDocumentFile(file('scan.pdf', pdf(''))), {
      message: /no text to extract/u,
    });
  });

  it('refuses a file that is not a PDF at all', async () => {
    await assert.rejects(readDocumentFile(file('fake.pdf', 'not a pdf')));
  });

  it('reads Markdown whatever type the browser reports, with LF line ends', async () => {
    assert.equal(
      await readDocumentFile(
        file('notes.md', '# Notes\r\n\r\nBody', 'application/octet-stream'),
      ),
      '# Notes\n\nBody',
    );
  });

  it('refuses text that is not UTF-8', async () => {
    await assert.rejects(
      readDocumentFile(
        file('latin1.txt', new Uint8Array([0x63, 0x61, 0x66, 0xe9])),
      ),
      { message: 'This file is not UTF-8 text' },
    );
  });

  it('refuses an empty text file', async () => {
    await assert.rejects(readDocumentFile(file('blank.txt', ' \n ')), {
      message: 'This file is empty',
    });
  });

  it('refuses text over the document limit rather than cutting it', async () => {
    await assert.rejects(
      readDocumentFile(
        file('long.txt', 'a'.repeat(DOCUMENT_LIMITS.content + 1)),
      ),
      { message: /holds 200,001 characters/u },
    );
  });

  it('refuses a kind of file it does not read', async () => {
    await assert.rejects(readDocumentFile(file('report.docx', 'x')), {
      message: UNSUPPORTED_FILE,
    });
  });
});
