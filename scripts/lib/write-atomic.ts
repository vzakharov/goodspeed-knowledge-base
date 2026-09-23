// Writing a file the harness's `Stop` check may be reading. It runs in parallel
// with the hook and counts a half-written file and a stray staging file alike,
// so a write is staged and renamed into place — under the repo's own gitignored
// `tmp/`, rename being atomic only within one filesystem.

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
