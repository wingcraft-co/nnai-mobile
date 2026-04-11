# Nomad Ops Replatform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current tab IA with a Timeline-first nomad-ops flow that prevents overstay and validates move connections in minutes.

**Architecture:** Add a small domain layer for stay/move risk computation, then build `Timeline/Connect/Alerts/Me` screens on top of existing mobile APIs (`city-stays`, `moves`, `profile`). Keep persona-linked coaching and pixel-art status visuals as presentation-layer behavior; keep risk calculation deterministic and shared.

**Tech Stack:** Expo Router, React Native, TypeScript, node:test contract tests in `scripts/tests`, existing API client and i18n hooks.

---

## File Structure And Ownership

### New files
- `src/features/nomad-ops.ts`
Purpose: pure domain helpers for must-leave calculation, risk state derivation, and connection constraint checks.
- `src/components/ops-risk-badge.tsx`
Purpose: reusable visual badge for `safe|warning|critical|overdue`, including pixel-art character state hook-in.
- `src/app/(tabs)/timeline.tsx`
Purpose: primary timeline screen (`must_leave_date`, next risk event, quick actions).
- `src/app/(tabs)/connect.tsx`
Purpose: move connector form and real-time validation panel.
- `src/app/(tabs)/alerts.tsx`
Purpose: prioritized alert queue from risk/constraint states.
- `scripts/tests/nomad-ops-domain.test.mjs`
Purpose: guard domain formulas and risk transitions.
- `scripts/tests/nomad-ops-ia.test.mjs`
Purpose: guard tab IA rename and required route presence.
- `scripts/tests/nomad-ops-events.test.mjs`
Purpose: guard required analytics event names in source.

### Modified files
- `src/app/(tabs)/_layout.tsx`
Purpose: switch tabs to `timeline/connect/alerts/me` and companion context mapping.
- `src/app/(tabs)/me.tsx`
Purpose: keep persona-linked coaching and ensure status badges/emotes map to risk states.
- `src/lib/analytics.ts`
Purpose: add typed event helpers for new MVP events.
- `src/types/api.ts`
Purpose: introduce explicit nomad-ops view models if needed (`RiskState`, connector checks).
- `package.json`
Purpose: add test scripts for new contract tests.

### Files to retire or de-scope (after parity check)
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/city.tsx`
Purpose: no longer top-level tabs after IA swap; keep temporarily for fallback until final cleanup commit.

---

### Task 1: Build Deterministic Nomad Ops Domain Layer

**Files:**
- Create: `src/features/nomad-ops.ts`
- Test: `scripts/tests/nomad-ops-domain.test.mjs`

- [ ] **Step 1: Write the failing domain tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMustLeaveDate,
  deriveRiskState,
  validateMoveConnection,
} from '../../src/features/nomad-ops';

test('computeMustLeaveDate adds allowed days from entry date', () => {
  assert.equal(computeMustLeaveDate('2026-04-01', 30), '2026-05-01');
});

test('deriveRiskState returns critical when today is after must leave', () => {
  assert.equal(deriveRiskState('2026-05-02', '2026-05-01', 7), 'overdue');
});

test('validateMoveConnection flags checkin mismatch', () => {
  const result = validateMoveConnection({
    mustLeaveDate: '2026-05-01',
    departDate: '2026-04-30',
    arriveDate: '2026-05-01',
    checkinDate: '2026-04-30',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasons[0], 'checkin_mismatch');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/nomad-ops-domain.test.mjs`  
Expected: FAIL with module/function-not-found errors.

- [ ] **Step 3: Write minimal implementation**

```ts
export type RiskState = 'safe' | 'warning' | 'critical' | 'overdue';

export function computeMustLeaveDate(entryDate: string, allowedDays: number): string {
  const base = new Date(`${entryDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + allowedDays);
  return base.toISOString().slice(0, 10);
}

export function deriveRiskState(today: string, mustLeaveDate: string, warningWindowDays: number): RiskState {
  const t = Date.parse(`${today}T00:00:00Z`);
  const m = Date.parse(`${mustLeaveDate}T00:00:00Z`);
  const diffDays = Math.floor((m - t) / 86_400_000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 0) return 'critical';
  if (diffDays <= warningWindowDays) return 'warning';
  return 'safe';
}

export function validateMoveConnection(input: {
  mustLeaveDate: string;
  departDate: string;
  arriveDate: string;
  checkinDate: string;
}) {
  const reasons: string[] = [];
  if (input.departDate > input.mustLeaveDate) reasons.push('overstay_risk');
  if (input.arriveDate > input.checkinDate) reasons.push('checkin_mismatch');
  return { ok: reasons.length === 0, reasons };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/tests/nomad-ops-domain.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/nomad-ops-domain.test.mjs src/features/nomad-ops.ts
git commit -m "feat: add nomad ops risk and connection domain helpers"
```

### Task 2: Switch Tab IA To Timeline/Connect/Alerts/Me

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`
- Test: `scripts/tests/nomad-ops-ia.test.mjs`

- [ ] **Step 1: Write the failing IA test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/nomad-ops-ia.test.mjs`  
Expected: FAIL because current layout still uses `index/city/me`.

- [ ] **Step 3: Update layout and companion context mapping**

```tsx
<Tabs.Screen name="timeline" options={{ title: t('타임라인', 'Timeline') }} />
<Tabs.Screen name="connect" options={{ title: t('연결', 'Connect') }} />
<Tabs.Screen name="alerts" options={{ title: t('알림', 'Alerts') }} />
<Tabs.Screen name="me" options={{ title: t('캐릭터', 'Character') }} />
```

```ts
const companionContext: CompanionContext = useMemo(() => {
  if (pathname.includes('connect')) return 'city';
  if (pathname.includes('me')) return 'me';
  return 'feed';
}, [pathname]);
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test scripts/tests/nomad-ops-ia.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/nomad-ops-ia.test.mjs 'src/app/(tabs)/_layout.tsx'
git commit -m "feat: replace tab IA with timeline connect alerts me"
```

### Task 3: Implement Timeline Screen With Must-Leave And Risk State

**Files:**
- Create: `src/app/(tabs)/timeline.tsx`
- Create: `src/components/ops-risk-badge.tsx`
- Modify: `src/api/cities.ts` (if helper endpoint wrappers needed)
- Test: `scripts/tests/nomad-ops-ia.test.mjs` (extend)

- [ ] **Step 1: Extend tests to require timeline data labels**

```js
test('timeline screen includes must leave and risk labels', () => {
  const content = fs.readFileSync('src/app/(tabs)/timeline.tsx', 'utf8');
  assert.match(content, /Must Leave Date|출국 필요일/);
  assert.match(content, /safe|warning|critical|overdue/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/nomad-ops-ia.test.mjs`  
Expected: FAIL because `timeline.tsx` does not exist yet.

- [ ] **Step 3: Build minimal timeline screen and risk badge component**

```tsx
const currentStay = stays.find((s) => s.left_at === null) ?? null;
const mustLeaveDate = currentStay
  ? computeMustLeaveDate(currentStay.arrived_at, allowedDaysInput)
  : null;
const risk = mustLeaveDate
  ? deriveRiskState(todayISO, mustLeaveDate, 7)
  : 'safe';
```

```tsx
export function OpsRiskBadge({ risk }: { risk: RiskState }) {
  return <ThemedText>{risk.toUpperCase()}</ThemedText>;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `node --test scripts/tests/nomad-ops-ia.test.mjs`  
Expected: PASS for timeline label assertions.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(tabs)/timeline.tsx' src/components/ops-risk-badge.tsx scripts/tests/nomad-ops-ia.test.mjs
git commit -m "feat: add timeline tab with must-leave risk state"
```

### Task 4: Implement Connect Screen With Real-Time Constraint Checks

**Files:**
- Create: `src/app/(tabs)/connect.tsx`
- Modify: `src/api/moves.ts`
- Test: `scripts/tests/nomad-ops-domain.test.mjs` (extend)

- [ ] **Step 1: Add failing tests for connector validation outcomes**

```js
test('validateMoveConnection returns overstay_risk when depart exceeds must leave', () => {
  const result = validateMoveConnection({
    mustLeaveDate: '2026-05-01',
    departDate: '2026-05-03',
    arriveDate: '2026-05-03',
    checkinDate: '2026-05-03',
  });
  assert.equal(result.ok, false);
  assert.match(result.reasons.join(','), /overstay_risk/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/nomad-ops-domain.test.mjs`  
Expected: FAIL if rule is not implemented yet.

- [ ] **Step 3: Build connect form and binding to domain check**

```tsx
const check = validateMoveConnection({
  mustLeaveDate,
  departDate,
  arriveDate,
  checkinDate,
});

const canConfirm = check.ok;
```

```tsx
<PixelButton disabled={!canConfirm} onPress={() => void onConfirmDraft()}>
  {t('이동안 확정', 'Confirm Move')}
</PixelButton>
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test scripts/tests/nomad-ops-domain.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(tabs)/connect.tsx' src/features/nomad-ops.ts scripts/tests/nomad-ops-domain.test.mjs src/api/moves.ts
git commit -m "feat: add connect tab with move constraint validation"
```

### Task 5: Implement Alerts Screen And Priority Queue

**Files:**
- Create: `src/app/(tabs)/alerts.tsx`
- Modify: `src/features/nomad-ops.ts`
- Test: `scripts/tests/nomad-ops-domain.test.mjs` (extend)

- [ ] **Step 1: Add failing tests for alert priority ordering**

```js
test('critical and overdue alerts are sorted above warning alerts', () => {
  const alerts = buildAlertQueue([
    { key: 'warning_buffer', severity: 'warning' },
    { key: 'overstay', severity: 'critical' },
  ]);
  assert.equal(alerts[0].key, 'overstay');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/nomad-ops-domain.test.mjs`  
Expected: FAIL because `buildAlertQueue` is missing.

- [ ] **Step 3: Implement queue helper and alerts screen rendering**

```ts
const weight: Record<RiskState | 'critical', number> = {
  overdue: 4,
  critical: 3,
  warning: 2,
  safe: 1,
};
return items.sort((a, b) => weight[b.severity] - weight[a.severity]);
```

```tsx
{alerts.map((alert) => (
  <GamePanel key={alert.key} title={alert.title} subtitle={alert.description} />
))}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test scripts/tests/nomad-ops-domain.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(tabs)/alerts.tsx' src/features/nomad-ops.ts scripts/tests/nomad-ops-domain.test.mjs
git commit -m "feat: add alerts tab with prioritized risk queue"
```

### Task 6: Track Required MVP Analytics Events

**Files:**
- Modify: `src/lib/analytics.ts`
- Modify: `src/app/(tabs)/timeline.tsx`
- Modify: `src/app/(tabs)/connect.tsx`
- Modify: `src/app/(tabs)/alerts.tsx`
- Create: `scripts/tests/nomad-ops-events.test.mjs`

- [ ] **Step 1: Add failing event contract test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/nomad-ops-events.test.mjs`  
Expected: FAIL for missing event names.

- [ ] **Step 3: Add typed tracker helper and call sites**

```ts
export type NomadOpsEventName =
  | 'timeline_viewed'
  | 'must_leave_computed'
  | 'move_draft_created'
  | 'constraint_error_shown'
  | 'move_draft_confirmed'
  | 'critical_alert_opened';

export function trackNomadOpsEvent(name: NomadOpsEventName, metadata?: Record<string, unknown>) {
  return trackQuestEvent({ name, occurred_at: new Date().toISOString(), metadata });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test scripts/tests/nomad-ops-events.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts 'src/app/(tabs)/timeline.tsx' 'src/app/(tabs)/connect.tsx' 'src/app/(tabs)/alerts.tsx' scripts/tests/nomad-ops-events.test.mjs
git commit -m "feat: add nomad ops analytics event instrumentation"
```

### Task 7: Preserve Persona + Pixel Art Behavior In Replatformed UI

**Files:**
- Modify: `src/app/(tabs)/me.tsx`
- Modify: `src/components/character-avatar.tsx` (only if new risk-state emote mapping needed)
- Test: `scripts/tests/persona-standard.test.mjs` (extend)

- [ ] **Step 1: Add failing tests for persona/risk presentation integration**

```js
test('me screen uses profile persona_type and risk badge mapping', () => {
  const content = fs.readFileSync('src/app/(tabs)/me.tsx', 'utf8');
  assert.match(content, /persona_type/);
  assert.match(content, /OpsRiskBadge/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/persona-standard.test.mjs`  
Expected: FAIL until `OpsRiskBadge` integration exists.

- [ ] **Step 3: Implement persona-aware coaching + pixel risk state render**

```tsx
const persona = profile?.persona_type ?? null;
const coaching = getPersonaCoaching(persona, riskState, t);

<OpsRiskBadge risk={riskState} />
<SpeechBubble text={coaching} />
<CharacterAvatar type={persona} size={64} />
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test scripts/tests/persona-standard.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(tabs)/me.tsx' src/components/character-avatar.tsx scripts/tests/persona-standard.test.mjs
git commit -m "feat: keep persona-linked pixel coaching in nomad ops IA"
```

### Task 8: Cleanup Old Tab Screens And Final Regression Gate

**Files:**
- Modify or remove: `src/app/(tabs)/index.tsx`, `src/app/(tabs)/city.tsx`
- Modify: `package.json`
- Modify: `scripts/tests/qa-ios-redesign.test.mjs`

- [ ] **Step 1: Update regression tests to new IA expectations**

```js
test('legacy turn and city routes are not wired as tab roots', () => {
  const content = read('src/app/(tabs)/_layout.tsx');
  assert.doesNotMatch(content, /name="index"/);
  assert.doesNotMatch(content, /name="city"/);
});
```

- [ ] **Step 2: Run test suite to verify failing/passing boundaries**

Run: `npm run test:qa-ios && node --test scripts/tests/nomad-ops-*.test.mjs`  
Expected: Existing QA tests may fail until assertions are updated for renamed IA.

- [ ] **Step 3: De-scope or route-guard old screens, then add package scripts**

```json
{
  "scripts": {
    "test:nomad-ops-domain": "node --test scripts/tests/nomad-ops-domain.test.mjs",
    "test:nomad-ops-ia": "node --test scripts/tests/nomad-ops-ia.test.mjs",
    "test:nomad-ops-events": "node --test scripts/tests/nomad-ops-events.test.mjs"
  }
}
```

- [ ] **Step 4: Run full verification**

Run:
- `npm run lint`
- `npm run test:persona`
- `npm run test:nomad-ops-domain`
- `npm run test:nomad-ops-ia`
- `npm run test:nomad-ops-events`

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/tests/qa-ios-redesign.test.mjs 'src/app/(tabs)/index.tsx' 'src/app/(tabs)/city.tsx'
git commit -m "chore: finalize nomad ops IA migration and test gates"
```

---

## Spec Coverage Self-Review

- IA 전면 개편 (`Timeline/Connect/Alerts/Me`): Task 2, 3, 4, 5, 8.
- must leave 계산/위험 상태: Task 1, 3.
- 이동 연결 충돌 감지/확정: Task 1, 4.
- Alerts 우선순위 큐: Task 5.
- 페르소나 연계 + 픽셀아트 유지: Task 7.
- MVP 이벤트 계측: Task 6.
- 2주 범위 유지(예약/추천 확장 제외): 모든 Task에서 기존 API 축 재사용으로 제한.

## Placeholder Scan

- `TODO/TBD/implement later` 없음.
- 각 태스크에 테스트 코드, 실행 명령, 커밋 명령 포함.

## Type Consistency Scan

- Risk state 타입은 `safe|warning|critical|overdue`로 통일.
- persona 필드는 기존 코드 표준인 `persona_type` 유지.
- 연결 검증 실패 사유 키는 `overstay_risk`, `checkin_mismatch`로 통일.
