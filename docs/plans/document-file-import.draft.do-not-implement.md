> ⛔ **DRAFT — DO NOT IMPLEMENT.** This plan is not approved. Do not edit source while this file is named `*.draft.do-not-implement.md` — prep and spikes go in `tmp/`. On an explicit operator go-ahead, `git mv` it to `*.in-progress.md` and delete this banner (quoting the go-ahead in the commit) *before* touching code.

# Import a document's content from a .txt, .md or .pdf file

## Goal

In the document editor, a reader can drop a `.txt`, `.md` or `.pdf` file (or pick one) and have its text show up in the **Content** field, where they check it and save it as usual. The file itself goes nowhere: it is read in the browser, and only the text reaches the API, through the save path that exists today. So this changes nothing in `apps/api` or `@kb/contracts`, and it fits the static export: reading a file is client work.

While a PDF is being read the form is blocked: an overlay over it, with a spinner and "Reading <file name>…". Parsing runs in pdf.js's own Web Worker, so the page stays responsive underneath. Text files are read so fast that they get no overlay.

## Behaviour

- **Where:** the shared `DocumentForm`, so both the New document page and the edit page get it. A compact `Dropzone` sits inside the Content field, above the Write/Preview tabs ("Drop a .txt, .md or .pdf file here, or click to choose"), and `Dropzone.FullScreen` catches a file dropped anywhere on the page. The editor page is the only place the full-screen zone is mounted, so no other page reacts to a dragged file.
- **What gets filled:** Content becomes the extracted text. When Title is empty it becomes the file name without its extension; a title the reader already typed is left alone. Tags are not touched.
- **Content that is already there** is replaced only after a confirmation ("Replace the current content with the text of <file>?"). An empty field is filled with no question. (Question 1.)
- **One file at a time.** `multiple={false}`. A rejected drop (wrong type, too large) shows the rejection's reason through `ErrorAlert`, in the same spot as a failed read.
- **Failures surface, never degrade silently** (CLAUDE.md § "Never silently swallow errors"). Each has a message in the reader's words:
  - a `.txt`/`.md` that is not valid UTF-8 → "This file is not UTF-8 text";
  - a PDF with no text layer (a scan) → "This PDF has no text to extract — it is probably a scan, and scans are not read here";
  - a password-protected or broken PDF → pdf.js's own reason, under "The PDF could not be read";
  - text longer than `DOCUMENT_LIMITS.content` → "The file holds N characters; a document holds at most 200,000". Nothing is cut off quietly: a truncated document reads as a complete one.
- **Size cap before reading:** a PDF over 50 MB and a text file over 4× `DOCUMENT_LIMITS.content` bytes (UTF-8's worst case) are rejected by the Dropzone's `maxSize`, so the browser never loads a file the limit would refuse anyway.

## PDF text extraction

pdf.js (`pdfjs-dist` 6.3) is Mozilla's PDF engine, the one Firefox renders PDFs with, and the only maintained option for this in the browser. It is **imported dynamically** at the moment a PDF is dropped, so its ~400 kB stays out of the editor's first load and never runs during the static prerender (it reads `DOMMatrix` and friends at module scope, which Node does not have).

- **The worker:** `GlobalWorkerOptions.workerPort = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' })`. Turbopack bundles `new Worker(new URL(…, import.meta.url))` into its own chunk, which lands in the static export like any other. This is the one piece the build has to prove; if Turbopack refuses it, the fallback is `workerSrc` set to the same `new URL(…)` as a string, which it resolves as an asset URL.
- **Predefined CMaps** (`cMapUrl`): PDFs whose CJK fonts are not embedded need Adobe's CMap files, or their text comes out empty. `pdfjs-dist/cmaps/` (169 files, 1.7 MB) is copied into `apps/web/public/pdfjs/cmaps/` at build and dev start, and loaded from there on demand. The copy is generated, so the directory is gitignored. (Question 2.)
- **From text items to text** — a pure function, `assemblePdfText(pages)`, over what `page.getTextContent()` returns, so it is unit-tested with no PDF involved:
  - items join into lines; `hasEOL` ends a line;
  - a vertical gap between lines well over the line height (more than 1.5× the item height) starts a new paragraph — a blank line — so the result reads as paragraphs rather than a wall of hard-wrapped lines, which also gives the chunker natural boundaries;
  - a word split by a hyphen at the end of a line (`exam-` / `ple`) is joined when the next line starts with a lowercase letter;
  - pages are separated by a blank line; runs of whitespace collapse; the result is trimmed.
- **What it does not do:** OCR, tables as tables, headings as `#`. The output is plain text in a Markdown field; the reader sees it in the field and in Preview, which is the point of filling the field rather than saving directly.

## Files

All of it lives in `apps/web/src/pages/document-editor/`: the editor is the only consumer, and a slice with one upward consumer belongs inside it (`.claude/rules/fsd.md`, "insignificant slices").

- `lib/read-file.ts` — `readDocumentFile(file): Promise<string>`: dispatches on the extension (MIME types for `.md` are unreliable across OSes — often empty or `application/octet-stream`), decodes text with `TextDecoder('utf-8', { fatal: true })`, and hands PDFs to `pdf-text.ts`. Enforces the content limit. Errors are `Error`s with the reader-facing messages above.
- `lib/pdf-text.ts` — loads pdf.js dynamically, wires the worker and `cMapUrl`, walks the pages, and destroys the loading task when done or failed.
- `lib/assemble-pdf-text.ts` + `assemble-pdf-text.test.ts` — the pure assembly above.
- `lib/file-kinds.ts` — the one table of accepted kinds: extension, MIME types, size cap. Both the Dropzone's `accept`/`maxSize` and `readDocumentFile`'s dispatch read it.
- `ui/file-import.tsx` — the compact `Dropzone`, the `Dropzone.FullScreen`, the replace confirmation and the error alert; takes `onText(text, fileName)` and reports `reading` so the form can block.
- `ui/document-form.tsx` — mounts `FileImport` in the Content wrapper, wraps the form in a positioned box with `LoadingOverlay` while a PDF is read, and applies the text (content; title when empty).
- `src/app/ui/theme-provider.tsx` — imports `@mantine/dropzone/styles.layer.css` beside core's, per `.claude/rules/styling.md`.
- `apps/web/package.json` — `@mantine/dropzone` (pinned by Mantine to the same 9.6.2 as core) and `pdfjs-dist`; the CMap copy step wired before `dev` and `build`.

## Tests

- **`assemble-pdf-text.test.ts`** — lines, paragraph gaps, hyphen joins (and a capitalized next line that is *not* joined), page breaks, empty pages, whitespace-only items.
- **`read-file.test.ts`** — against a real PDF: the test writes a minimal one-page PDF as bytes (a Helvetica content stream with two paragraphs and a hyphenated word) and runs `readDocumentFile` on it under Node, through pdf.js's legacy build, so the adapter — item filtering, the page loop, cleanup — is covered along with the assembler. Plus a non-UTF-8 `.txt`, an over-limit text, an unknown extension, and a PDF with no text. No fixture file is committed; the bytes live in the test.
- **By hand, through `/preview`:** drop each kind on both editor pages, in both themes; confirm the overlay blocks the form during a large PDF while the page stays scrollable; confirm the confirmation on non-empty content.

## Steps

1. Add the two dependencies and the dropzone stylesheet import.
2. Write `file-kinds.ts`, `assemble-pdf-text.ts` and its test.
3. Write `pdf-text.ts` and `read-file.ts` with their test; prove the worker bundles by running `pnpm build` and loading the exported editor page.
4. Add the CMap copy step and the gitignore line.
5. Write `file-import.tsx` and wire it into `DocumentForm`, overlay included.
6. Look at it through `/preview`; then `/polish`, and hand the PR back to `/pr`.

## DRY notes

- **Shared:** the accepted-kinds table (`file-kinds.ts`) is the single home for extensions, MIME types and caps; the Dropzone's props and the reader's dispatch both derive from it, so a new kind is one row.
- **Reused:** `DOCUMENT_LIMITS.content` from `@kb/contracts` for the length check and the text-file cap, not a local number; `ErrorAlert` for every failure; the existing Mantine `Modal` pattern `ConfirmDelete` uses, for the replace confirmation.
- **Not extracted:** `ConfirmDelete` is not generalised into a `Confirm` component for this second use. It owns a mutation, a delete-red button and its own trigger; the replace confirmation owns none of those, so a shared component would be a props bag switching between two behaviours. The two share only `Modal` + two buttons, which is Mantine's API already.
- **Not extracted:** the file reader stays in the editor slice rather than `shared/lib`. It has one consumer and knows about the document limit; if chat ever takes a dropped file, it moves down then.

## Open questions

Each carries a recommendation, and the plan above is written with it in force.

1. **Content that is already in the field when a file is dropped.**
   a. *(recommended)* Replace it after a confirmation; fill an empty field with no question. The edit page is where refreshing a document from a new version of its file is useful, and the confirmation is what keeps that from destroying unsaved typing.
   b. Offer the import on the New document page only.
   c. Append the file's text to what is there.
2. **Predefined CMaps for PDFs with non-embedded CJK fonts.**
   a. *(recommended)* Copy them from `pdfjs-dist` into `public/` at build, gitignored, and load them from the app's own origin.
   b. Load them from a CDN (`cdn.jsdelivr.net/npm/pdfjs-dist@<version>/cmaps/`) — no build step, but a runtime dependency on a third party, and the reader's PDF text never leaves the browser either way, so this only trades the build step for an outside host.
   c. Leave them out; such PDFs fail with the "no text to extract" message.
