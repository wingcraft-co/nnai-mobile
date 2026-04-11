import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('required nomad ops event names exist in source', () => {
  const source = [
    fs.readFileSync('src/lib/analytics.ts', 'utf8'),
    fs.readFileSync('src/app/(tabs)/timeline.tsx', 'utf8'),
    fs.readFileSync('src/app/(tabs)/connect.tsx', 'utf8'),
    fs.readFileSync('src/app/(tabs)/alerts.tsx', 'utf8'),
  ].join('\n');

  for (const name of [
    'timeline_viewed',
    'must_leave_computed',
    'move_draft_created',
    'constraint_error_shown',
    'move_draft_confirmed',
    'critical_alert_opened',
  ]) {
    assert.match(source, new RegExp(name));
  }
});
