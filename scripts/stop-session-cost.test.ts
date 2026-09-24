/**
 * Drives the ledger's `Stop` hook as the harness does — a payload on stdin, over
 * a clone with a bare `origin` — and reads the repository it leaves behind. What
 * it protects is the tree the harness's own `Stop` check reads: the row committed
 * and pushed without leaving anything dirty or ahead, the agent's own work left
 * where it was, and a line to the agent only where the check had something to
 * count.
 */

import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  appendFileSync,
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import { assistantRecord, PRICES } from './lib/cost-fixtures.ts';

const REPO = path.resolve(import.meta.dirname, '..');
const HOOK = '.claude/hooks/stop-session-cost.sh';
const ROW = '.claude/costs/sessions/2026-03/sess.json';

/**
 * A branch pushed to a bare `origin`, carrying the ledger's code and none of its
 * rows, with a `HOME` of its own so no global git config or launcher settings
 * reach it.
 */
const clone = () => {
  const base = mkdtempSync(path.join(tmpdir(), 'stop-session-cost-'));
  const origin = path.join(base, 'origin.git');
  const root = path.join(base, 'repo');
  const home = path.join(base, 'home');
  const transcript = path.join(base, 'transcript.jsonl');
  mkdirSync(home);

  const env = {
    PATH: process.env['PATH'] ?? '/usr/bin:/bin',
    HOME: home,
    GIT_CONFIG_NOSYSTEM: '1',
  };

  const run = (
    command: string,
    args: string[],
    input?: string,
  ): SpawnSyncReturns<string> =>
    spawnSync(command, args, {
      encoding: 'utf8',
      input,
      env: { ...env, CLAUDE_PROJECT_DIR: root },
    });

  const git = (...args: string[]): string => {
    const { status, stdout, stderr } = run('git', ['-C', root, ...args]);
    assert.equal(status, 0, stderr);
    return stdout.trim();
  };

  run('git', ['init', '-q', '--bare', origin]);
  run('git', ['init', '-q', '-b', 'main', root]);
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  git('config', 'commit.gpgsign', 'false');
  git('remote', 'add', 'origin', origin);

  for (const file of [
    HOOK,
    '.claude/hooks/lib.sh',
    'scripts/session-cost.ts',
    'scripts/lib',
    'package.json',
  ])
    cpSync(path.join(REPO, file), path.join(root, file), {
      recursive: true,
      filter: (source) =>
        !source.endsWith('.test.ts') && !source.includes('__pycache__'),
    });
  mkdirSync(path.join(root, '.claude/costs'));
  writeFileSync(path.join(root, '.claude/costs/prices.json'), PRICES);
  symlinkSync(path.join(REPO, 'node_modules'), path.join(root, 'node_modules'));
  writeFileSync(path.join(root, '.gitignore'), 'tmp/\nnode_modules\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'init');
  git('push', '-q', 'origin', 'main');
  git('checkout', '-q', '-b', 'feature');
  git('push', '-q', '-u', 'origin', 'feature');

  let responses = 0;
  // One more priced turn in the transcript, so the next row differs.
  const respond = (): void => {
    responses += 1;
    appendFileSync(
      transcript,
      `${assistantRecord(`msg_${responses}`, 'end_turn', 1000)}\n`,
    );
  };
  respond();

  return {
    root,
    origin,
    home,
    git,
    respond,

    registerCheck: (): void => {
      mkdirSync(path.join(home, '.claude'), { recursive: true });
      writeFileSync(
        path.join(home, '.claude/launcher-settings.json'),
        JSON.stringify({
          hooks: {
            Stop: [
              { hooks: [{ command: '~/.claude/stop-hook-git-check.sh' }] },
            ],
          },
        }),
      );
    },

    stop: ({ active = false } = {}): SpawnSyncReturns<string> =>
      run(
        path.join(root, HOOK),
        [],
        JSON.stringify({
          hook_event_name: 'Stop',
          session_id: 'sess',
          transcript_path: transcript,
          cwd: root,
          stop_hook_active: active,
        }),
      ),

    // `scripts/session-cost.ts` run by hand, the way an agent or a person runs it.
    cost: (): void => {
      const { status, stderr } = run(process.execPath, [
        path.join(root, 'scripts/session-cost.ts'),
        '--transcript',
        transcript,
        '--session-id',
        'sess',
      ]);
      assert.equal(status, 0, stderr);
    },

    status: (): string => git('status', '--porcelain'),
    commits: (): number => Number(git('rev-list', '--count', 'HEAD')),
    filesIn: (rev: string): string[] =>
      git('show', '--name-only', '--format=', rev).split('\n'),
  };
};

type Clone = ReturnType<typeof clone>;

const assertLevelWithOrigin = (repo: Clone): void => {
  assert.equal(repo.status(), '');
  const head = repo.git('rev-parse', 'HEAD');
  assert.equal(repo.git('rev-parse', 'origin/feature'), head);
  const remote = spawnSync('git', ['-C', repo.origin, 'rev-parse', 'feature'], {
    encoding: 'utf8',
  });
  assert.equal(remote.stdout.trim(), head);
};

describe('stop-session-cost: the tree the harness check reads', () => {
  let repo: Clone;
  beforeEach(() => {
    repo = clone();
  });

  it('commits and pushes the row, leaving the tree clean', () => {
    const { status, stderr } = repo.stop();
    assert.deepEqual([status, stderr], [0, '']);
    assertLevelWithOrigin(repo);
    assert.match(
      repo.git('log', '-1', '--format=%s'),
      /^chore: session cost \+/,
    );
    assert.deepEqual(repo.filesIn('HEAD'), [ROW]);
  });

  it('keeps the tree clean and level while the push is in flight', () => {
    // `origin` runs this before it takes the push, which is the stretch the
    // harness's check could land in. A repository hook runs with `origin`'s own
    // git environment set, which would point the clone's commands at it.
    const seen = path.join(repo.root, '..', 'seen');
    const probe = path.join(repo.origin, 'hooks/pre-receive');
    writeFileSync(
      probe,
      [
        '#!/bin/sh',
        'unset GIT_DIR GIT_QUARANTINE_PATH GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES',
        `cd '${repo.root}' && { git status --porcelain; git rev-list --count origin/feature..HEAD; } > '${seen}'`,
        '',
      ].join('\n'),
    );
    chmodSync(probe, 0o755);
    assert.equal(repo.stop().status, 0);
    assert.equal(readFileSync(seen, 'utf8'), '0\n');
  });

  it('signs the row where commits are signed', () => {
    // A stand-in for gpg: git asks only for the status line and an armoured
    // block, so no key is needed to see whether it was asked at all.
    const signer = path.join(repo.home, 'sign');
    writeFileSync(
      signer,
      [
        '#!/bin/sh',
        'cat >/dev/null',
        "echo '[GNUPG:] SIG_CREATED ' >&2",
        String.raw`printf -- '-----BEGIN PGP SIGNATURE-----\n\nstub\n-----END PGP SIGNATURE-----\n'`,
        '',
      ].join('\n'),
    );
    chmodSync(signer, 0o755);
    repo.git('config', 'gpg.program', signer);
    repo.git('config', 'commit.gpgsign', 'true');
    assert.equal(repo.stop().status, 0);
    assert.match(repo.git('cat-file', 'commit', 'HEAD'), /gpgsig/);
  });

  it('does not commit a row that has not changed', () => {
    repo.stop();
    const before = repo.commits();
    const { status, stderr } = repo.stop();
    assert.deepEqual([status, stderr], [0, '']);
    assert.equal(repo.commits(), before);
    assertLevelWithOrigin(repo);
  });

  it('leaves work the agent has staged staged, and out of the commit', () => {
    writeFileSync(path.join(repo.root, 'work.txt'), 'in flight\n');
    repo.git('add', 'work.txt');
    const { status, stderr } = repo.stop();
    assert.equal(status, 2);
    assert.match(stderr, /committed and pushed/);
    assert.equal(repo.git('diff', '--cached', '--name-only'), 'work.txt');
    assert.deepEqual(repo.filesIn('HEAD'), [ROW]);
  });

  it('names a row left dirty to the agent where a check read it', () => {
    repo.registerCheck();
    repo.stop();
    repo.respond();
    repo.cost();
    assert.notEqual(repo.status(), '');
    const { status, stderr } = repo.stop();
    assert.equal(status, 2);
    assert.match(stderr, /was counting it/);
    assertLevelWithOrigin(repo);
  });

  it('commits a row left dirty silently where no check ran', () => {
    repo.stop();
    repo.respond();
    repo.cost();
    const { status, stderr } = repo.stop();
    assert.deepEqual([status, stderr], [0, '']);
    assertLevelWithOrigin(repo);
  });

  it('never blocks a re-fired Stop', () => {
    repo.registerCheck();
    repo.stop();
    repo.respond();
    repo.cost();
    const { status, stderr } = repo.stop({ active: true });
    assert.deepEqual([status, stderr], [0, '']);
    assertLevelWithOrigin(repo);
  });

  it('reports a failed push as committed but not pushed', () => {
    repo.git(
      'remote',
      'set-url',
      'origin',
      path.join(repo.root, '..', 'missing.git'),
    );
    const { status, stderr } = repo.stop();
    assert.equal(status, 2);
    assert.match(stderr, /committed but not pushed/);
    assert.equal(repo.status(), '');
    assert.equal(repo.git('rev-list', '--count', 'origin/feature..HEAD'), '1');
  });
});
