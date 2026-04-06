import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ME_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'me.tsx');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('character tab includes explicit checkpoint guidance copy', () => {
  const content = read(ME_FILE);

  assert.match(content, /Growth Checkpoints/i);
  assert.match(content, /How to complete checkpoints|체크포인트 완료 방법/);
  assert.match(content, /Complete 1 planner task|플래너 할 일 1개 완료/);
  assert.match(content, /save 1 local event|로컬 이벤트 1개 저장/i);
  assert.match(content, /5-day streak|연속 5일 달성/i);
});
