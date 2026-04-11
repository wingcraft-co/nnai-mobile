import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = process.cwd();
const NOMAD_OPS_FILE = path.join(ROOT, 'src', 'features', 'nomad-ops.ts');
const require = createRequire(import.meta.url);

function loadNomadOpsModule() {
  const source = fs.readFileSync(NOMAD_OPS_FILE, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: NOMAD_OPS_FILE,
  });

  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require,
    console,
    process,
    setTimeout,
    clearTimeout,
  });

  vm.runInContext(transpiled.outputText, context, { filename: NOMAD_OPS_FILE });
  return context.module.exports;
}

const { computeMustLeaveDate, deriveRiskState, validateMoveConnection } = loadNomadOpsModule();

test('computeMustLeaveDate adds allowed days from entry date', () => {
  assert.equal(computeMustLeaveDate('2026-04-01', 30), '2026-05-01');
});

test('computeMustLeaveDate throws on invalid entry date', () => {
  assert.throws(
    () => computeMustLeaveDate('not-a-date', 30),
    {
      name: 'TypeError',
      message: /entryDate must be a valid ISO date string/,
    },
  );
});

test('deriveRiskState returns overdue when today is after must leave', () => {
  assert.equal(deriveRiskState('2026-05-02', '2026-05-01', 7), 'overdue');
});

test('deriveRiskState returns critical on the exact must leave date', () => {
  assert.equal(deriveRiskState('2026-05-01', '2026-05-01', 7), 'critical');
});

test('deriveRiskState returns warning within the warning window', () => {
  assert.equal(deriveRiskState('2026-04-29', '2026-05-01', 7), 'warning');
});

test('deriveRiskState returns safe outside the warning window', () => {
  assert.equal(deriveRiskState('2026-04-20', '2026-05-01', 7), 'safe');
});

test('deriveRiskState throws on invalid date input', () => {
  assert.throws(
    () => deriveRiskState('2026-05-01', 'not-a-date', 7),
    {
      name: 'TypeError',
      message: /mustLeaveDate must be a valid ISO date string/,
    },
  );
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

test('validateMoveConnection allows arriving before checkin', () => {
  const result = validateMoveConnection({
    mustLeaveDate: '2026-05-01',
    departDate: '2026-04-30',
    arriveDate: '2026-04-29',
    checkinDate: '2026-05-01',
  });

  assert.equal(result.ok, true);
  assert.equal(result.reasons.length, 0);
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
