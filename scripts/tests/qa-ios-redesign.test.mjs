import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FEED_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'index.tsx');
const SHELL_FILE = path.join(ROOT, 'src', 'components', 'screen-shell.tsx');
const TABS_FILE = path.join(ROOT, 'src', 'app', '(tabs)', '_layout.tsx');
const CITY_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'city.tsx');
const ME_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'me.tsx');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('turn tab hides raw author ID from the UI', () => {
  const content = read(FEED_FILE);

  assert.doesNotMatch(content, /\bID\b\s*[:\-]?\s*\{\s*[^}]+\s*\}/i);
});

test('screen shell does not render SIM MODE', () => {
  const content = read(SHELL_FILE);

  assert.doesNotMatch(content, /SIM MODE/);
});

test('tabs use semantic icons instead of single-letter circles', () => {
  const content = read(TABS_FILE);

  assert.doesNotMatch(content, /TabIcon\s+label="(?:T|C|R)"/);
  assert.doesNotMatch(content, /function\s+TabIcon\(/);
});

test('city tab has a confirmation flow before leave action', () => {
  const content = read(CITY_FILE);

  assert.doesNotMatch(content, /onPress=\{\(\)\s*=>\s*void\s*onLeave\(\)\}/);
  assert.match(content, /Alert\.alert\([\s\S]{0,240}?(?:Leave City|이 도시 떠나기)[\s\S]{0,240}?(?:Cancel|취소)/i);
});

test('character tab includes explicit checkpoint guidance copy', () => {
  const content = read(ME_FILE);

  assert.match(content, /Growth Checkpoints/i);
  assert.match(content, /How to complete checkpoints|체크포인트 완료 방법/);
  assert.match(content, /Complete 1 planner task|플래너 할 일 1개 완료/);
  assert.match(content, /save 1 local event|로컬 이벤트 1개 저장/i);
  assert.match(content, /5-day streak|연속 5일 달성/i);
});
