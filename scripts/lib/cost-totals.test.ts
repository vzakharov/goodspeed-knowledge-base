/**
 * The rollup is a pure function of the rows, so each case is the rows written
 * out. What it protects is the bucketing rule — a session counted where it
 * started — and the branch label the report groups on.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { row, tally } from './cost-fixtures.ts';
import { branchLabel, isoWeek, totalsOf } from './cost-totals.ts';

describe('cost-totals: where a session is counted', () => {
  it('files a session under the day, week and month it started in', () => {
    const totals = totalsOf([row()]);
    assert.equal(totals.byDay['2026-03-04']?.costUsd, 1);
    assert.equal(totals.byMonth['2026-03']?.costUsd, 1);
    assert.equal(totals.byWeek['2026-W10']?.costUsd, 1);
  });

  it('keeps a session that ran past midnight whole, in the day it began', () => {
    const totals = totalsOf([
      row({
        firstResponseAt: '2026-03-04T23:50:00.000Z',
        lastResponseAt: '2026-03-05T00:30:00.000Z',
      }),
    ]);
    assert.equal(totals.byDay['2026-03-04']?.sessions, 1);
    assert.equal(totals.byDay['2026-03-05'], undefined);
  });

  it('counts a row with no priced response in the grand total and its branch alone', () => {
    const totals = totalsOf([row({ firstResponseAt: null, total: tally(0) })]);
    assert.equal(totals.sessions, 1);
    assert.equal(totals.byBranch['a-branch']?.sessions, 1);
    assert.deepEqual(totals.byMonth, {});
  });

  it('sums sessions that share a bucket', () => {
    const totals = totalsOf([row(), row({ total: tally(2.5) })]);
    assert.equal(totals.costUsd, 3.5);
    assert.equal(totals.byMonth['2026-03']?.sessions, 2);
  });
});

describe('cost-totals: how a branch is labelled', () => {
  it('names the PRs beside the branch, for a reader to click through', () => {
    assert.equal(branchLabel(row({ prs: [70, 71] })), 'a-branch #70 #71');
  });

  it('counts a session touching two PRs once, under its branch', () => {
    const totals = totalsOf([row({ prs: [70, 71] })]);
    assert.equal(totals.byBranch['a-branch #70 #71']?.sessions, 1);
    assert.equal(totals.costUsd, 1);
  });

  it('says so rather than dropping a row whose branch went unrecorded', () => {
    assert.equal(branchLabel(row({ branch: null })), '(no branch)');
  });
});

describe('cost-totals: whose session it was', () => {
  it('sums the spend by operator handle', () => {
    const totals = totalsOf([
      row({ operator: 'vzakharov' }),
      row({ operator: 'vzakharov', total: tally(2) }),
    ]);
    assert.equal(totals.byOperator['@vzakharov']?.costUsd, 3);
  });

  it('files a row that named nobody under an unknown operator, not a guess', () => {
    const totals = totalsOf([row()]);
    assert.equal(totals.byOperator['(unknown)']?.sessions, 1);
  });
});

describe('cost-totals: ISO weeks', () => {
  it('gives a late-December day the next year’s week when that week’s Thursday is', () => {
    // 2025-12-29 is a Monday whose Thursday falls on 2026-01-01.
    assert.equal(isoWeek(new Date('2025-12-29T00:00:00.000Z')), '2026-W01');
  });

  it('gives an early-January day the previous year’s last week by the same rule', () => {
    // 2027-01-01 is a Friday whose Thursday fell on 2026-12-31.
    assert.equal(isoWeek(new Date('2027-01-01T00:00:00.000Z')), '2026-W53');
  });
});
