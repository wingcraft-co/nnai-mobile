import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const API_TYPES_FILE = path.join(SRC_DIR, 'types', 'api.ts');

function readAllSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readAllSourceFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

test('src code does not use deprecated nomad_type contract keys', () => {
  const files = readAllSourceFiles(SRC_DIR);
  const offenders = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('nomad_type') || content.includes('author_nomad_type')) {
      offenders.push(path.relative(ROOT, file));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Found deprecated keys in files:\n${offenders.map((x) => `- ${x}`).join('\n')}`,
  );
});

test('api types defines PersonaType standard enum values', () => {
  const content = fs.readFileSync(API_TYPES_FILE, 'utf8');

  assert.match(content, /export type PersonaType =/);
  assert.match(content, /'wanderer'/);
  assert.match(content, /'local'/);
  assert.match(content, /'planner'/);
  assert.match(content, /'free_spirit'/);
  assert.match(content, /'pioneer'/);
});
