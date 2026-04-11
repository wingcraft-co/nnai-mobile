import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SHELL_FILE = path.join(ROOT, 'src', 'components', 'screen-shell.tsx');
const TABS_FILE = path.join(ROOT, 'src', 'app', '(tabs)', '_layout.tsx');
const INDEX_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'index.tsx');
const CITY_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'city.tsx');
const ME_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'me.tsx');
const COMPANION_FILE = path.join(ROOT, 'src', 'components', 'floating-companion.tsx');
const COMPANION_MESSAGES_FILE = path.join(ROOT, 'src', 'constants', 'companion-messages.ts');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('legacy index route file is removed', () => {
  assert.equal(fs.existsSync(INDEX_FILE), false);
});

test('screen shell does not render SIM MODE', () => {
  const content = read(SHELL_FILE);

  assert.doesNotMatch(content, /SIM MODE/);
});

test('screen shell top bar shows full date and right-side FX from home country fallback KRW', () => {
  const content = read(SHELL_FILE);

  assert.match(content, /formatTopDate/);
  assert.match(content, /\$\{year\},\s\$\{day\}\s\$\{month\}/);
  assert.match(content, /Promise\.allSettled/);
  assert.match(content, /fetchProfile/);
  assert.match(content, /fetchCityStays/);
  assert.match(content, /DEFAULT_HOME_CURRENCY/);
  assert.match(content, /DEFAULT_LOCAL_CURRENCY/);
  assert.match(content, /frankfurter\.app/);
  assert.match(content, /KRW/);
  assert.match(content, /환율 정보 없음|FX unavailable/);
});

test('tabs use semantic icons instead of single-letter circles', () => {
  const content = read(TABS_FILE);

  assert.doesNotMatch(content, /TabIcon\s+label="(?:T|C|R)"/);
  assert.doesNotMatch(content, /function\s+TabIcon\(/);
});

test('legacy turn and city routes are not wired as tab roots', () => {
  const content = read(TABS_FILE);
  assert.doesNotMatch(content, /name="index"/);
  assert.doesNotMatch(content, /name="city"/);
});

test('legacy city route file is removed', () => {
  assert.equal(fs.existsSync(CITY_FILE), false);
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

test('companion opens external browser from character tap for new city/country guidance', () => {
  const companion = read(COMPANION_FILE);
  const messages = read(COMPANION_MESSAGES_FILE);

  assert.match(messages, /새 나라/);
  assert.match(companion, /COMPANION_TAB_BAR_CLEARANCE\s*=\s*-6/);
  assert.doesNotMatch(companion, /flexDirection:\s*'row'/);
  assert.match(companion, /marginBottom:\s*6/);
  assert.doesNotMatch(companion, /tailDirection=\"right\"/);
  assert.match(companion, /shouldOpenExternalForDestination/);
  assert.match(companion, /if\s*\(\s*shouldOpenExternalForDestination\(message\)\s*\)\s*\{[\s\S]{0,200}?Linking\.openURL\(EASTER_EGG_URL\)[\s\S]{0,80}?return;/);
  assert.match(companion, /<Pressable onPress=\{\(\)\s*=>\s*void onPressCharacter\(\)\}>/);
});
