# iOS QA Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QA 리포트의 Critical/High 이슈를 해소하면서 iOS 실용형(B 스타일)으로 Turn/City/Character 탭 UI를 전면 개편한다.

**Architecture:** 먼저 토큰/공통 UI 레이어를 정비하고, 이후 탭 레이아웃과 각 화면을 순차적으로 재구성한다. 치명 이슈(raw ID 노출, 빈 카드, SIM MODE, destructive action 확인 누락)는 화면 재디자인과 동시에 고정하며, API 스키마는 유지하고 UI 표시/상호작용 규칙만 강화한다.

**Tech Stack:** Expo 55, React Native, expo-router, TypeScript, node:test 기반 계약 테스트

---

### Task 1: QA 계약 테스트 추가 (RED 시작점)

**Files:**
- Create: `scripts/tests/qa-ios-redesign.test.mjs`
- Modify: `package.json`
- Test: `scripts/tests/qa-ios-redesign.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TURN_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'index.tsx');
const CITY_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'city.tsx');
const ME_FILE = path.join(ROOT, 'src', 'app', '(tabs)', 'me.tsx');
const SHELL_FILE = path.join(ROOT, 'src', 'components', 'screen-shell.tsx');
const TABS_FILE = path.join(ROOT, 'src', 'app', '(tabs)', '_layout.tsx');

test('turn tab hides raw author ID from UI', () => {
  const content = fs.readFileSync(TURN_FILE, 'utf8');
  assert.doesNotMatch(content, /ID:\s*\$\{?authorId\}?/);
});

test('screen shell does not render SIM MODE label for user-facing screen', () => {
  const content = fs.readFileSync(SHELL_FILE, 'utf8');
  assert.doesNotMatch(content, /SIM MODE/);
});

test('tabs use semantic icons, not single-letter circles', () => {
  const content = fs.readFileSync(TABS_FILE, 'utf8');
  assert.doesNotMatch(content, /label="T"|label="C"|label="R"/);
});

test('city tab requires confirmation flow before leave action', () => {
  const content = fs.readFileSync(CITY_FILE, 'utf8');
  assert.match(content, /Alert\.alert|confirmLeave|onConfirmLeave/);
});

test('character tab includes checkpoint guidance copy', () => {
  const content = fs.readFileSync(ME_FILE, 'utf8');
  assert.match(content, /Growth Checkpoints|성장 체크포인트/);
  assert.match(content, /how to|달성 조건|조건/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/qa-ios-redesign.test.mjs`  
Expected: FAIL (현재 코드에 `SIM MODE`, `ID:${authorId}`, `T/C/R` 등 존재)

- [ ] **Step 3: Add npm script for repeatable execution**

```json
{
  "scripts": {
    "test:qa-ios": "node --test scripts/tests/qa-ios-redesign.test.mjs"
  }
}
```

- [ ] **Step 4: Run all fast contract tests**

Run: `npm run test:qa-ios && npm run test:persona && npm run test:me`  
Expected: `test:qa-ios` FAIL, 기존 테스트는 기존 상태 유지

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/qa-ios-redesign.test.mjs package.json
git commit -m "test: add QA-driven iOS redesign contract checks"
```

### Task 2: 디자인 토큰 및 공통 컨테이너 리프레시

**Files:**
- Modify: `src/constants/theme.ts`
- Modify: `src/components/screen-shell.tsx`
- Modify: `src/components/game-ui.tsx`
- Test: `scripts/tests/qa-ios-redesign.test.mjs`

- [ ] **Step 1: Extend theme tokens for practical iOS-style surfaces**

```typescript
// src/constants/theme.ts (example shape)
export const Colors = {
  light: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F3F5',
    border: '#E3E7EC',
    text: '#101418',
    textSecondary: '#5B6673',
    accent: '#0A84FF',
    destructive: '#FF3B30',
    success: '#2EBD85',
  },
  dark: {
    background: '#0D1117',
    surface: '#161B22',
    surfaceMuted: '#1F2630',
    border: '#2B3440',
    text: '#F2F5F8',
    textSecondary: '#A7B0BA',
    accent: '#4DA3FF',
    destructive: '#FF6B63',
    success: '#3BCF95',
  },
};
```

- [ ] **Step 2: Remove user-facing SIM banner from ScreenShell and keep compact date context**

```tsx
// src/components/screen-shell.tsx
<View style={headerStripStyle}>
  <ThemedText style={dayTextStyle}>{`DAY ${day}`}</ThemedText>
</View>
```

- [ ] **Step 3: Harmonize card/metric primitives in game-ui with new token names**

```tsx
// src/components/game-ui.tsx (example)
const panelStyle = {
  backgroundColor: theme.surface,
  borderColor: theme.border,
  borderRadius: 16,
  padding: 16,
};
```

- [ ] **Step 4: Re-run redesign test**

Run: `npm run test:qa-ios`  
Expected: `SIM MODE` 관련 assertion PASS, 나머지는 일부 FAIL 유지

- [ ] **Step 5: Commit**

```bash
git add src/constants/theme.ts src/components/screen-shell.tsx src/components/game-ui.tsx
git commit -m "refactor: refresh UI tokens and shared shell surfaces"
```

### Task 3: 탭바 iOS 실아이콘 전환 + 플로팅 캐릭터 충돌 완화

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`
- Modify: `src/components/floating-companion.tsx`
- Test: `scripts/tests/qa-ios-redesign.test.mjs`

- [ ] **Step 1: Replace lettered tab icons with semantic icons**

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';

<Tabs.Screen
  name="index"
  options={{
    title: t('턴', 'Turn'),
    tabBarIcon: ({ color, size }) => (
      <MaterialCommunityIcons name="checklist" color={color} size={size} />
    ),
  }}
/>
```

- [ ] **Step 2: Update tab bar style to practical iOS proportions**

```tsx
tabBarStyle: {
  backgroundColor: colors.surface,
  borderTopColor: colors.border,
  height: 82,
  paddingTop: 6,
  paddingBottom: 8,
}
```

- [ ] **Step 3: Move floating companion so it does not cover primary content**

```tsx
// src/components/floating-companion.tsx
bottom: BottomTabInset + 12,
right: 12,
opacity: 0.94,
```

- [ ] **Step 4: Verify icon-contract tests**

Run: `npm run test:qa-ios`  
Expected: 탭 아이콘 관련 assertion PASS

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(tabs)/_layout.tsx' src/components/floating-companion.tsx
git commit -m "feat: adopt semantic iOS tab icons and reposition companion"
```

### Task 4: Turn 탭 QA 핵심 수정 (ID 제거, 빈 카드 fallback, 지표 명확화)

**Files:**
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/components/character-avatar.tsx` (필요 시 fallback 표현 보강)
- Test: `scripts/tests/qa-ios-redesign.test.mjs`

- [ ] **Step 1: Keep failing test visible, then implement raw ID removal**

```tsx
// remove
// <ThemedText>ID:{authorId}</ThemedText>

// replace with
<View style={authorBadgeStyle}>
  <ThemedText style={authorBadgeText}>{t('Nomad Post', 'Nomad Post')}</ThemedText>
</View>
```

- [ ] **Step 2: Implement explicit empty-image card fallback UI**

```tsx
{post.picture?.trim() ? (
  <Image source={{ uri: post.picture }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
) : (
  <View style={fallbackCardStyle}>
    <CharacterAvatar type={post.author_persona_type ?? 'local'} size={64} />
    <ThemedText style={fallbackTitle}>{t('이미지 준비 중', 'Image coming soon')}</ThemedText>
    <ThemedText style={fallbackBody}>{t('상황 카드 데이터가 동기화되면 표시됩니다.', 'Card media will appear after sync.')}</ThemedText>
  </View>
)}
```

- [ ] **Step 3: Relabel metrics for clarity (Energy/Progress/Completed)**

```tsx
<StatTile label={t('에너지', 'Energy')} value={`${energy}%`} />
<StatTile label={t('진행도', 'Progress')} value={`${xp}%`} tone="accent" />
<StatTile label={t('완료', 'Completed')} value={`${questDone}/${questTotal}`} />
```

- [ ] **Step 4: Run focused tests**

Run: `npm run test:qa-ios`  
Expected: raw ID/빈 카드 관련 contract PASS

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(tabs)/index.tsx' src/components/character-avatar.tsx
git commit -m "fix: remove raw IDs and add robust situation-card fallback"
```

### Task 5: City 탭 플로우 개선 (VISA 경로 명시 + Leave 확인 모달)

**Files:**
- Modify: `src/app/(tabs)/city.tsx`
- Test: `scripts/tests/qa-ios-redesign.test.mjs`

- [ ] **Step 1: Add leave confirmation dialog guard**

```tsx
import { Alert } from 'react-native';

const onPressLeave = () => {
  Alert.alert(
    t('도시 떠나기', 'Leave city'),
    t('정말 이 도시를 떠나시겠습니까?', 'Are you sure you want to leave this city?'),
    [
      { text: t('취소', 'Cancel'), style: 'cancel' },
      { text: t('떠나기', 'Leave'), style: 'destructive', onPress: () => void onLeave() },
    ],
  );
};
```

- [ ] **Step 2: Render explicit VISA missing state with edit CTA**

```tsx
{!currentStay?.visa_expires_at ? (
  <View style={missingVisaCalloutStyle}>
    <ThemedText style={missingVisaTitle}>{t('VISA 정보가 설정되지 않았습니다.', 'VISA is not set.')}</ThemedText>
    <Pressable onPress={onStartEdit} style={inlineCtaStyle}>
      <ThemedText style={inlineCtaText}>{t('도시 정보 수정', 'Edit city details')}</ThemedText>
    </Pressable>
  </View>
) : null}
```

- [ ] **Step 3: Keep city cards separated by purpose with practical labels**

```tsx
<GamePanel title={t('이동 준비 상태', 'Migration Readiness')} ... />
<GamePanel title={t('현재 도시 정보', 'Current City')} ... />
```

- [ ] **Step 4: Verify contract tests**

Run: `npm run test:qa-ios`  
Expected: leave confirmation / visa guidance assertions PASS

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(tabs)/city.tsx'
git commit -m "feat: add leave confirmation and explicit visa setup guidance"
```

### Task 6: Character 탭 문구/학습성 개선 + 복수형 교정

**Files:**
- Modify: `src/app/(tabs)/me.tsx`
- Modify: `src/features/persona-companion.ts`
- Modify: `src/constants/companion-messages.ts`
- Test: `scripts/tests/qa-ios-redesign.test.mjs`

- [ ] **Step 1: Add explicit Growth Checkpoints guidance block**

```tsx
<View style={checkpointHintStyle}>
  <ThemedText style={hintTitle}>{t('성장 체크포인트 달성 조건', 'How to complete checkpoints')}</ThemedText>
  <ThemedText style={hintItem}>• {t('체크리스트 1개 이상 완료', 'Complete at least one checklist task')}</ThemedText>
  <ThemedText style={hintItem}>• {t('로컬/커뮤니티 액션 1회', 'Do one local/community action')}</ThemedText>
  <ThemedText style={hintItem}>• {t('연속 턴 5일 유지', 'Maintain a 5-day streak')}</ThemedText>
</View>
```

- [ ] **Step 2: Replace ambiguous CTA copy with functional labels**

```tsx
// example replacements
t('여정 요약 보기', 'View trip summary')
t('다음 목적지 계획', 'Plan next destination')
```

- [ ] **Step 3: Fix singular/plural in companion copy helper**

```typescript
const unit = days === 1 ? 'day' : 'days';
return `${days} ${unit} in ${stay.city}${stay.country ? `, ${stay.country}` : ''}.`;
```

- [ ] **Step 4: Run QA + existing test suites**

Run: `npm run test:qa-ios && npm run test:persona && npm run test:me && npm run lint`  
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(tabs)/me.tsx' src/features/persona-companion.ts src/constants/companion-messages.ts
git commit -m "feat: improve checkpoint guidance and polish character copy"
```

### Task 7: 통합 검증 및 iOS 시뮬레이터 확인

**Files:**
- Modify: 없음 (검증 전용)
- Test: `scripts/tests/qa-ios-redesign.test.mjs`, iOS 런타임

- [ ] **Step 1: Run full local verification**

Run: `npm run test:qa-ios && npm run test:persona && npm run test:me && npm run lint`  
Expected: PASS

- [ ] **Step 2: Boot iOS app**

Run: `npm run ios -- --port 8082`  
Expected: `Build Succeeded`, simulator app launch

- [ ] **Step 3: Manual QA smoke checklist**

```text
1) Turn 카드에 raw ID 미노출
2) 이미지 없는 카드 fallback 표시
3) SIM MODE 미노출
4) City > Leave City 시 확인 다이얼로그 표시
5) VISA 미설정 시 Edit city details CTA 노출
6) Character에서 Growth 조건 설명 확인
7) 하단 탭 아이콘이 의미 아이콘으로 표시
8) "1 day / 2 days" 문구 정상 표시
```

- [ ] **Step 4: Capture final status**

Run: `git status --short`  
Expected: clean or expected staged files only

- [ ] **Step 5: Commit (if any final polish required)**

```bash
git add -A
git commit -m "chore: finalize iOS QA redesign verification adjustments"
```
