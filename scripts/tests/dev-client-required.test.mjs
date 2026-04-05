import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PACKAGE_JSON = path.join(ROOT, 'package.json');

test('ios development build includes expo-dev-client dependency', () => {
  const raw = fs.readFileSync(PACKAGE_JSON, 'utf8');
  const pkg = JSON.parse(raw);
  const deps = pkg.dependencies ?? {};

  assert.ok(deps['expo-dev-client'], 'Missing dependency: expo-dev-client');
});
