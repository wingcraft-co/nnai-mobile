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

  const lower = content.toLowerCase();
  const checkpointAnchor = lower.indexOf('growth checkpoints');
  const guidanceWindow =
    checkpointAnchor >= 0
      ? content.slice(Math.max(0, checkpointAnchor - 300))
      : content;

  assert.match(guidanceWindow, /checkpoint/i);
  assert.match(guidanceWindow, /How to complete checkpoints|체크포인트 완료 방법/i);
  assert.match(guidanceWindow, /1\./);
  assert.match(guidanceWindow, /2\./);
  assert.match(guidanceWindow, /3\./);
  assert.match(guidanceWindow, /planner|플래너/i);
  assert.match(guidanceWindow, /local event|로컬 이벤트/i);
  assert.match(guidanceWindow, /streak|연속\s*5일|5-day/i);
});
