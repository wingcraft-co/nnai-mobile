import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'src', 'features', 'quest-engine.ts');

function read() {
  return fs.readFileSync(FILE, 'utf8');
}

test('quest engine exports required pure functions', () => {
  const content = read();

  assert.match(content, /export function createQuest\(/);
  assert.match(content, /export function submitProof\(/);
  assert.match(content, /export function applyDeadlineResult\(/);
  assert.match(content, /export function canUseSaveRun\(/);
  assert.match(content, /export function applySaveRun\(/);
  assert.match(content, /export function updateCombo\(/);
});

test('quest engine enforces deadline and active-status transitions', () => {
  const content = read();

  assert.match(content, /assertQuestActive/);
  assert.match(content, /cannot submit proof after deadline/);
  assert.match(content, /deadline_at must be after created_at/);
  assert.match(content, /failed_at: input\.server_now/);
});

test('quest engine includes save-run weekly limit and combo reset rules', () => {
  const content = read();

  assert.match(content, /save run weekly limit exceeded/);
  assert.match(content, /used_week_keys: \[\.\.\.input\.save_run\.used_week_keys, input\.week_key\]/);
  assert.match(content, /streak_current: 0/);
  assert.match(content, /streak_best: Math\.max/);
});

