import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ME_TAB_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'me.tsx');
const HELPER_FILE = path.join(ROOT, 'src', 'features', 'persona-companion.ts');

test('me tab has top fixed persona section sized near 30% of screen', () => {
  const content = fs.readFileSync(ME_TAB_FILE, 'utf8');

  assert.match(content, /useWindowDimensions/);
  assert.match(content, /sectionHeight\s*=\s*.*0\.3/);
  assert.match(content, /height:\s*sectionHeight/);
});

test('me tab builds chatter from db-backed city_stays and cities data', () => {
  const content = fs.readFileSync(ME_TAB_FILE, 'utf8');

  assert.match(content, /fetchCityStays/);
  assert.match(content, /fetchCities/);
  assert.match(content, /currentStay/);
  assert.match(content, /matchedCity|currentCity/);
  assert.match(content, /buildPersonaChatterLines/);
});

test('me tab avoids unsafe persona_type indexing for profile payload', () => {
  const content = fs.readFileSync(ME_TAB_FILE, 'utf8');

  assert.doesNotMatch(content, /PersonaTypes\[profileData\.persona_type\]\.actionType/);
  assert.match(content, /getPersonaTypeConfig/);
});

test('persona companion helper defines sleep window and local-time sleep decision', () => {
  const content = fs.readFileSync(HELPER_FILE, 'utf8');

  assert.match(content, /WORLD_AVERAGE_SLEEP_START_HOUR/);
  assert.match(content, /WORLD_AVERAGE_WAKE_HOUR/);
  assert.match(content, /isSleepingByLocalTime/);
});

test('me tab companion card keeps night theme and uses white background in daytime', () => {
  const content = fs.readFileSync(ME_TAB_FILE, 'utf8');

  assert.match(content, /background:\s*'#1a2133'/);
  assert.match(content, /:\s*\{\s*background:\s*'#ffffff'/);
});
