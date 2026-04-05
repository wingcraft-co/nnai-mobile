import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const POSTS_API_FILE = path.join(ROOT, 'src', 'api', 'posts.ts');

test('posts api resolves relative media paths into absolute urls', () => {
  const content = fs.readFileSync(POSTS_API_FILE, 'utf8');

  assert.match(content, /function toAbsoluteMediaUrl/);
  assert.match(content, /if\s*\(trimmed\.startsWith\('\/'\)\)\s*\{\s*return\s*`\$\{API_BASE\}\$\{trimmed\}`;/);
});

test('createPost sends image fields with backward-compatible keys', () => {
  const content = fs.readFileSync(POSTS_API_FILE, 'utf8');

  assert.match(content, /image_url:\s*data\.picture\s*\?\?\s*undefined/);
  assert.match(content, /post_image_url:\s*data\.picture\s*\?\?\s*undefined/);
  assert.match(content, /picture:\s*data\.picture\s*\?\?\s*undefined/);
});
