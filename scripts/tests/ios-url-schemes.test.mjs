import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_JSON = path.join(ROOT, 'app.json');

test('ios url schemes include app scheme and Google OAuth scheme', () => {
  const raw = fs.readFileSync(APP_JSON, 'utf8');
  const app = JSON.parse(raw);
  const urlTypes = app?.expo?.ios?.infoPlist?.CFBundleURLTypes ?? [];

  const schemes = urlTypes.flatMap((entry) => entry?.CFBundleURLSchemes ?? []);
  assert.ok(schemes.includes('nnainomad'));
  assert.ok(
    schemes.includes('com.googleusercontent.apps.962318799283-7tsqbo64f14h6hfvgrn8b4fbgp43o6s5'),
  );
});
