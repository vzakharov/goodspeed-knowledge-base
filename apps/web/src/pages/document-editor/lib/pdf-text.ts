import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

import { assemblePdfText, type PdfTextItem } from './assemble-pdf-text';

const isTextItem = (item: TextItem | TextMarkedContent): item is TextItem =>
  'str' in item;

/**
 * The PDF's text, read by pdf.js in its own worker so the page stays
 * responsive however long the file takes.
 */
export async function pdfText(data: ArrayBuffer): Promise<string> {
  // Loaded when a PDF arrives, so the editor never pays for pdf.js on a text
  // file. The legacy build because the modern one leans on APIs a year-old
  // browser lacks (`Uint8Array.prototype.toHex`), and Node does too.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc ||= new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
  // `apps/web/scripts/copy-pdfjs-assets.ts` puts them there, under the
  // version they belong to.
  const assets = `/pdfjs/${pdfjs.version}`;
  const loading = pdfjs.getDocument({
    data,
    cMapUrl: `${assets}/cmaps/`,
    standardFontDataUrl: `${assets}/standard_fonts/`,
  });

  try {
    const document = await loading.promise;
    const pages: PdfTextItem[][] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const { items } = await page.getTextContent();
      pages.push(items.filter(isTextItem));
    }
    return assemblePdfText(pages);
  } catch (error) {
    if (error instanceof pdfjs.PasswordException) {
      throw new Error(
        'This PDF is protected by a password, and protected PDFs are not read here',
        { cause: error },
      );
    }
    throw error;
  } finally {
    await loading.destroy();
  }
}
