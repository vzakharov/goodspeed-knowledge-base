import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { returnPath, signInHref } from './return-to.ts';

const searchOf = (href: string) => new URL(href, 'http://app').searchParams;

describe('returnPath', () => {
  it('returns to the path sign-in was sent from', () => {
    assert.equal(returnPath(searchOf(signInHref('/chat?c=1'))), '/chat?c=1');
  });

  it('goes home with nothing remembered', () => {
    assert.equal(returnPath(searchOf('/sign-in')), '/');
  });

  it('goes home rather than to another origin', () => {
    for (const next of [
      'https://evil.example',
      '//evil.example',
      String.raw`/\evil.example`,
    ]) {
      assert.equal(returnPath(new URLSearchParams({ next })), '/', next);
    }
  });
});
