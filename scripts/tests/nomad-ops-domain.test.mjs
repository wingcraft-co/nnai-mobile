import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NOMAD_OPS_FILE = path.join(ROOT, 'src', 'features', 'nomad-ops.ts');

function read() {
  return fs.readFileSync(NOMAD_OPS_FILE, 'utf8');
}

test('nomad ops domain exports the required helpers', () => {
  const content = read();

  assert.match(content, /export type RiskState\s*=\s*'safe'\s*\|\s*'warning'\s*\|\s*'critical'\s*\|\s*'overdue'/);
  assert.match(content, /export function computeMustLeaveDate\(entryDate:\s*string,\s*allowedDays:\s*number\):\s*string/);
  assert.match(content, /export function deriveRiskState\([\s\S]*?\):\s*RiskState/);
  assert.match(content, /export function validateMoveConnection\(input:\s*\{/);
});

test('computeMustLeaveDate adds allowed days from entry date', () => {
  const content = read();

  assert.match(content, /base\.setUTCDate\(base\.getUTCDate\(\)\s*\+\s*allowedDays\)/);
  assert.match(content, /return base\.toISOString\(\)\.slice\(0,\s*10\)/);
});

test('deriveRiskState returns overdue when today is after must leave', () => {
  const content = read();

  assert.match(content, /if\s*\(todayDate\s*>\s*mustLeaveDateDate\)\s*return 'overdue'/);
});

test('validateMoveConnection flags checkin mismatch', () => {
  const content = read();

  assert.match(content, /if\s*\(arriveDate\s*>\s*checkinDate\)\s*reasons\.push\('checkin_mismatch'\)/);
  assert.match(content, /if\s*\(departDate\s*>\s*mustLeaveDate\)\s*reasons\.push\('overstay_risk'\)/);
});
