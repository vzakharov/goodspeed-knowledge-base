// For a file the harness's parallel `Stop` check may be reading, which counts a
// half-written file and a stray staging file alike: staged under the repo's own
// gitignored `tmp/` (rename is atomic only within one filesystem), then renamed.

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const writeAtomic = (
  root: string,
  out: string,
  contents: string,
): void => {
  const staged = path.join(root, 'tmp', `${path.basename(out)}.staged`);
  mkdirSync(path.dirname(staged), { recursive: true });
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(staged, contents);
  renameSync(staged, out);
};
