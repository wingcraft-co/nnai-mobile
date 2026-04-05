import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_TYPES_FILE = path.join(ROOT, 'src', 'types', 'api.ts');
const AUTH_API_FILE = path.join(ROOT, 'src', 'api', 'auth.ts');
const TYPE_ACTIONS_FILE = path.join(ROOT, 'src', 'api', 'type-actions.ts');

test('auth user contract requires email and persona_type', () => {
  const content = fs.readFileSync(API_TYPES_FILE, 'utf8');

  assert.match(content, /export type User =/);
  assert.match(content, /email:\s*string;/);
  assert.match(content, /persona_type:\s*PersonaType\s*\|\s*null;/);
});

test('post contract includes author_persona_type', () => {
  const content = fs.readFileSync(API_TYPES_FILE, 'utf8');

  assert.match(content, /author_persona_type:\s*PersonaType\s*\|\s*null;/);
});

test('auth api still targets mobile token and me endpoints', () => {
  const content = fs.readFileSync(AUTH_API_FILE, 'utf8');

  assert.match(content, /\/auth\/mobile\/token/);
  assert.match(content, /\/auth\/mobile\/me/);
});

test('type-actions api includes all latest endpoint groups', () => {
  const content = fs.readFileSync(TYPE_ACTIONS_FILE, 'utf8');

  assert.match(content, /type-actions\/planner/);
  assert.match(content, /type-actions\/free-spirit/);
  assert.match(content, /type-actions\/wanderer/);
  assert.match(content, /type-actions\/local/);
  assert.match(content, /type-actions\/pioneer/);
});
