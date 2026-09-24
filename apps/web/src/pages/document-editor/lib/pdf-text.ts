import type {
  TextItem,
  TextMarkedContent,
} from 'pdfjs-dist/types/src/display/api';

import { assemblePdfText } from './assemble-pdf-text';

const isTextItem = (item: TextItem | TextMarkedContent): item is TextItem =>
  'str' in item;

/**
 * The PDF's text, read by pdf.js in its own worker so the page stays
 * responsive however long the file takes. Aborting `signal` tears the worker's
 * document down and rejects with the signal's reason.
 */
export async function pdfText(
  data: ArrayBuffer,
  signal?: AbortSignal,
): Promise<string> {
  // Loaded when a PDF arrives, so a text file costs the editor nothing of
  // pdf.js. The legacy build: the modern one needs `Uint8Array.prototype.toHex`,
  // which Node and older browsers lack.
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

  let destroying: Promise<void> | undefined;
  const abort = () => {
    destroying = loading.destroy();
  };
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const document = await loading.promise;
    const pages = await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const { items } = await page.getTextContent();
        return items.filter((item) => isTextItem(item));
      }),
    );
    return assemblePdfText(pages);
  } catch (error) {
    // What a destroyed document rejects with says nothing of why it was.
    signal?.throwIfAborted();
    if (!(error instanceof Error) || error.name !== 'PasswordException') {
      throw error;
    }
    throw new Error(
      'This PDF is protected by a password, and protected PDFs are not read here',
      { cause: error },
    );
  } finally {
    signal?.removeEventListener('abort', abort);
    await (destroying ?? loading.destroy());
  }
}
