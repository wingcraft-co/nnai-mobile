import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUTH_API_FILE = path.join(ROOT, 'src', 'api', 'auth.ts');
const LOGIN_FILE = path.join(ROOT, 'src', 'app', '(auth)', 'login.tsx');

test('mobile token exchange request includes optional oauth client metadata fields', () => {
  const content = fs.readFileSync(AUTH_API_FILE, 'utf8');

  assert.match(content, /client_id/);
  assert.match(content, /platform/);
});

test('login screen maps Google OAuth failed detail to actionable backend mismatch hint', () => {
  const content = fs.readFileSync(LOGIN_FILE, 'utf8');

  assert.match(content, /Google OAuth failed/);
  assert.match(content, /redirect_uri/);
  assert.match(content, /EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS/);
});
