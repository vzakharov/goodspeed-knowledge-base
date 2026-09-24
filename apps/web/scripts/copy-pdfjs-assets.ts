#!/usr/bin/env node

/**
 * Copies the files pdf.js fetches at run time — Adobe's CMaps, for text in
 * CJK fonts a PDF does not embed, and the standard fonts — from `pdfjs-dist`
 * into `public/pdfjs/<version>/`, where the static export serves them. The
 * `dev` and `build` scripts run it first; the output is gitignored.
 *
 * The version in the path is what `pdf-text.ts` asks for, so a browser holding
 * the files of an older pdf.js never serves them to a newer one.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { z } from 'zod';

const require = createRequire(import.meta.url);
const pdfjs = path.dirname(require.resolve('pdfjs-dist/package.json'));
const { version } = z
  .object({ version: z.string() })
  .parse(JSON.parse(fs.readFileSync(path.join(pdfjs, 'package.json'), 'utf8')));

const target = path.join(import.meta.dirname, '..', 'public', 'pdfjs');
fs.rmSync(target, { recursive: true, force: true });
for (const directory of ['cmaps', 'standard_fonts']) {
  fs.cpSync(path.join(pdfjs, directory), path.join(target, version, directory), {
    recursive: true,
  });
}
