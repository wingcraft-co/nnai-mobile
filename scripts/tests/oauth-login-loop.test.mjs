import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOGIN_FILE = path.join(ROOT, 'src', 'app', '(auth)', 'login.tsx');

test('login screen handles OAuth success response only once per code', () => {
  const content = fs.readFileSync(LOGIN_FILE, 'utf8');

  assert.match(content, /handledAuthCodeRef/);
  assert.match(content, /if\s*\(handledAuthCodeRef\.current\s*===\s*code\)\s*\{\s*return;\s*\}/);
  assert.match(content, /handledAuthCodeRef\.current\s*=\s*code/);
  assert.match(content, /const oauthResponse = await promptAsync\(\)/);
  assert.match(content, /handleOAuthResponse\(oauthResponse\)/);
});

test('login screen handles OAuth code from initial deep link URL on cold start', () => {
  const content = fs.readFileSync(LOGIN_FILE, 'utf8');

  assert.match(content, /Linking\.getInitialURL\(\)/);
  assert.match(content, /const code = extractCodeFromUrl\(initialUrl\)/);
  assert.match(content, /void completeOAuthByCode\(code, redirectUri\)/);
});
