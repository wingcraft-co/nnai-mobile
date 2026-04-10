import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'src', 'lib', 'pr-proof.ts');

function read() {
  return fs.readFileSync(FILE, 'utf8');
}

test('pr-proof validator supports github pull request URL contract', () => {
  const content = read();

  assert.match(content, /export function validatePrProofUrl\(input: string\)/);
  assert.match(content, /\/owner\/repo\/pull\/\{number\}/);
  assert.match(content, /const \[owner, repo, pullLiteral, prNumberText\] = segments/);
  assert.match(content, /pr_number: prNumber/);
});

test('pr-proof validator rejects non-https and non-github hosts', () => {
  const content = read();

  assert.match(content, /invalid_protocol/);
  assert.match(content, /invalid_host/);
  assert.match(content, /url\.protocol !== 'https:'/);
  assert.match(content, /ALLOWED_HOSTS/);
});

test('pr-proof validator validates positive integer PR number', () => {
  const content = read();

  assert.match(content, /invalid_pr_number/);
  assert.match(content, /Number\.isInteger\(prNumber\)/);
  assert.match(content, /prNumber <= 0/);
});

