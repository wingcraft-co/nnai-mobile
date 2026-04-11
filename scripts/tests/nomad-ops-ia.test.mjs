import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('tabs layout exposes timeline/connect/alerts/me routes', () => {
  const content = fs.readFileSync('src/app/(tabs)/_layout.tsx', 'utf8');
  assert.match(content, /name="timeline"/);
  assert.match(content, /name="connect"/);
  assert.match(content, /name="alerts"/);
  assert.match(content, /name="me"/);
  assert.doesNotMatch(content, /name="index"/);
  assert.doesNotMatch(content, /name="city"/);
});

test('timeline screen includes must leave and risk labels', () => {
  const content = fs.readFileSync('src/app/(tabs)/timeline.tsx', 'utf8');
  assert.match(content, /Must Leave Date|출국 필요일/);
  assert.match(content, /safe|warning|critical|overdue/);
});
