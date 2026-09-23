import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  type PickedColorScheme,
  preferredColorScheme,
} from './color-scheme.ts';

type Case = {
  picked: PickedColorScheme;
  system: PickedColorScheme;
  expected: string;
};

const CASES: Case[] = [
  { picked: 'dark', system: 'light', expected: 'dark' },
  { picked: 'light', system: 'dark', expected: 'light' },
  { picked: 'light', system: 'light', expected: 'auto' },
  { picked: 'dark', system: 'dark', expected: 'auto' },
];

describe('preferredColorScheme', () => {
  for (const { picked, system, expected } of CASES) {
    it(`stores ${expected} for ${picked} picked on a ${system} system`, () => {
      assert.equal(preferredColorScheme(picked, system), expected);
    });
  }
});
