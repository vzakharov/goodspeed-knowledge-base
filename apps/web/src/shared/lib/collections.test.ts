import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isOneOf, oneOf, oneOfEach } from './collections.ts';

const SITES = ['vova', 'lsa'] as const;
const LOCALES = ['en', 'ru'] as const;

describe('isOneOf', () => {
  it('accepts a listed literal', () => {
    assert.equal(isOneOf(SITES)('lsa'), true);
  });

  it('rejects an unlisted string', () => {
    assert.equal(isOneOf(SITES)('playgram'), false);
  });

  // The guard takes `unknown`, so anything a route segment or an environment
  // read can hand over has to answer false rather than throw.
  it('rejects a non-string', () => {
    for (const value of [undefined, null, 0, {}, ['lsa']]) {
      assert.equal(isOneOf(SITES)(value), false);
    }
  });
});

describe('oneOf', () => {
  it('returns the value it was given', () => {
    assert.equal(oneOf(SITES, 'vova'), 'vova');
  });

  it('names the list and the bad value in the throw', () => {
    assert.throws(
      () => oneOf(SITES, undefined),
      /^Error: Expected one of vova, lsa, not undefined$/,
    );
  });
});

describe('oneOfEach', () => {
  it('takes a sequence that stops anywhere', () => {
    assert.deepEqual(oneOfEach([SITES, LOCALES], []), []);
    assert.deepEqual(oneOfEach([SITES, LOCALES], ['lsa']), ['lsa']);
    assert.deepEqual(oneOfEach([SITES, LOCALES], ['lsa', 'ru']), ['lsa', 'ru']);
  });

  it('checks each value against the list at its own position', () => {
    assert.throws(
      () => oneOfEach([SITES, LOCALES], ['en']),
      /^Error: Expected one of vova, lsa, not en$/,
    );
  });

  it('reports the whole sequence when it runs long', () => {
    assert.throws(
      () => oneOfEach([SITES, LOCALES], ['lsa', 'ru', 'extra']),
      /^Error: Expected at most 2 values, not 3: lsa, ru, extra$/,
    );
  });
});
