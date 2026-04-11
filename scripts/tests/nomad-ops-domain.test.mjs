import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeMustLeaveDate,
  deriveRiskState,
  validateMoveConnection,
} from '../../src/features/nomad-ops.ts';

test('computeMustLeaveDate adds allowed days from entry date', () => {
  assert.equal(computeMustLeaveDate('2026-04-01', 30), '2026-05-01');
});

test('deriveRiskState returns overdue when today is after must leave', () => {
  assert.equal(deriveRiskState('2026-05-02', '2026-05-01', 7), 'overdue');
});

test('validateMoveConnection flags checkin mismatch', () => {
  const result = validateMoveConnection({
    mustLeaveDate: '2026-05-01',
    departDate: '2026-04-30',
    arriveDate: '2026-05-02',
    checkinDate: '2026-05-01',
  });

  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('checkin_mismatch'));
});

test('validateMoveConnection flags overstay risk', () => {
  const result = validateMoveConnection({
    mustLeaveDate: '2026-05-01',
    departDate: '2026-05-02',
    arriveDate: '2026-05-01',
    checkinDate: '2026-05-01',
  });

  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('overstay_risk'));
});
