import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_CLIENT_FILE = path.join(ROOT, 'src', 'api', 'client.ts');

test('api client guards requests with timeout abort to avoid infinite loading', () => {
  const content = fs.readFileSync(API_CLIENT_FILE, 'utf8');

  assert.match(content, /AbortController/);
  assert.match(content, /setTimeout\(\(\)\s*=>\s*controller\.abort\(\),\s*API_TIMEOUT_MS\)/);
  assert.match(content, /'name' in error/);
  assert.match(content, /if\s*\(errorName === 'AbortError'\)/);
  assert.match(content, /new ApiError\(408,\s*'API request timeout'\)/);
});
