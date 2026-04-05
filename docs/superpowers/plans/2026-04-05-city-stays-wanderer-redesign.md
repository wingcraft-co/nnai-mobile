# City Stays + Wanderer 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 탭 2를 모든 타입 공통의 "현재 도시 체류 관리(비자 D-day, 예산, 지나온 도시)" 화면으로 재설계하고, Wanderer Me 탭을 "다음 행선지 포커스 + 조건 충족 관리"로 교체한다.

**Architecture:** 새 `CityStay` 타입과 `/api/mobile/city-stays` API를 추가하고, 기존 `WandererHop` 타입에 `conditions`/`is_focus` 필드를 추가한다. 백엔드가 준비되기 전까지는 `dev-mock.ts`의 mock 핸들러로 개발한다.

**Tech Stack:** React Native (Expo), TypeScript, `useTheme()`, `ScreenShell`, `ThemedText`, `Pressable`, `TextInput`, `apiRequest`

---

## 파일 맵

| 파일 | 변경 |
|------|------|
| `src/types/api.ts` | `CityStay`, `WandererHopCondition` 추가; `WandererHop` 수정 |
| `src/api/cities.ts` | city_stays API 함수 4개 추가 |
| `src/api/type-actions.ts` | wanderer hops 함수 추가/수정 |
| `src/data/dev-mock.ts` | city_stays mock 데이터 + 핸들러; wanderer hops 업데이트 |
| `src/app/(tabs)/city.tsx` | 전면 재작성 |
| `src/app/(tabs)/me.tsx` | wanderer 섹션 교체 |

---

## Task 1: 타입 정의

**Files:**
- Modify: `src/types/api.ts`

- [ ] **Step 1: `CityStay` 타입과 `WandererHopCondition` 추가, `WandererHop` 수정**

`src/types/api.ts` 파일 끝에 추가하고, 기존 `WandererHop` 타입을 교체한다.

```typescript
// 기존 WandererHop을 아래로 교체
export type WandererHopCondition = {
  id: string;
  label: string;
  is_done: boolean;
};

export type WandererHop = {
  id: number;
  from_country: string | null;
  to_country: string;
  to_city: string | null;
  note: string | null;
  target_month: string | null;
  status: 'planned' | 'booked';
  conditions: WandererHopCondition[];
  is_focus: boolean;
};

// 파일 끝에 추가
export type CityStay = {
  id: number;
  city: string;
  country: string | null;
  arrived_at: string;        // "YYYY-MM-DD"
  left_at: string | null;    // null = 현재 도시
  visa_expires_at: string | null;
  budget_total: number | null;
  budget_remaining: number | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/api.ts
git commit -m "feat: add CityStay type and update WandererHop with conditions/is_focus"
```

---

## Task 2: API 함수 추가

**Files:**
- Modify: `src/api/cities.ts`
- Modify: `src/api/type-actions.ts`

- [ ] **Step 1: `src/api/cities.ts`에 city_stays 함수 추가**

파일 상단 import에 `CityStay` 추가 후, 기존 코드 아래에 추가:

```typescript
import { apiRequest } from './client';

import type { City, CityStay, Pin } from '@/types/api';

export const fetchCities = (): Promise<City[]> => apiRequest('/api/mobile/cities');
export const fetchCity = (cityId: string): Promise<City> => apiRequest(`/api/mobile/cities/${cityId}`);
export const fetchPins = (): Promise<Pin[]> => apiRequest('/api/mobile/pins');
export const createPin = (data: {
  city: string;
  display: string;
  note: string;
  lat: number;
  lng: number;
}): Promise<Pin> =>
  apiRequest('/api/mobile/pins', { method: 'POST', body: JSON.stringify(data) });

export const fetchCityStays = (): Promise<CityStay[]> =>
  apiRequest('/api/mobile/city-stays');

export const createCityStay = (data: {
  city: string;
  country?: string | null;
  arrived_at: string;
  visa_expires_at?: string | null;
  budget_total?: number | null;
  budget_remaining?: number | null;
}): Promise<CityStay> =>
  apiRequest('/api/mobile/city-stays', { method: 'POST', body: JSON.stringify(data) });

export const patchCityStay = (
  id: number,
  data: Partial<Pick<CityStay, 'city' | 'country' | 'arrived_at' | 'visa_expires_at' | 'budget_total' | 'budget_remaining'>>,
): Promise<CityStay> =>
  apiRequest(`/api/mobile/city-stays/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const leaveCityStay = (id: number): Promise<CityStay> =>
  apiRequest(`/api/mobile/city-stays/${id}/leave`, { method: 'POST' });
```

- [ ] **Step 2: `src/api/type-actions.ts` wanderer 함수 수정**

기존 `fetchWandererHops`, `patchWandererHop`을 교체하고 `createWandererHop`, `deleteWandererHop` 추가:

```typescript
// 기존 import에 WandererHopCondition 추가
import type {
  FreeSpiritSpin,
  LocalEventRec,
  PlannerBoard,
  PlannerTask,
  PioneerMilestone,
  WandererHop,
  WandererHopCondition,
} from '@/types/api';

// 기존 fetchWandererHops, patchWandererHop을 아래로 교체
export const fetchWandererHops = (): Promise<WandererHop[]> =>
  apiRequest('/api/mobile/type-actions/wanderer/hops');

export const createWandererHop = (data: {
  to_country: string;
  to_city?: string | null;
  from_country?: string | null;
  target_month?: string | null;
  note?: string | null;
  status?: 'planned' | 'booked';
  conditions?: WandererHopCondition[];
  is_focus?: boolean;
}): Promise<WandererHop> =>
  apiRequest('/api/mobile/type-actions/wanderer/hops', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const patchWandererHop = (
  hopId: number,
  data: Partial<Pick<WandererHop, 'status' | 'to_country' | 'to_city' | 'target_month' | 'note' | 'conditions' | 'is_focus'>>,
): Promise<WandererHop> =>
  apiRequest(`/api/mobile/type-actions/wanderer/hops/${hopId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteWandererHop = (hopId: number): Promise<void> =>
  apiRequest(`/api/mobile/type-actions/wanderer/hops/${hopId}`, { method: 'DELETE' });
```

- [ ] **Step 3: 커밋**

```bash
git add src/api/cities.ts src/api/type-actions.ts
git commit -m "feat: add city-stays API functions and update wanderer hop API"
```

---

## Task 3: Dev Mock 업데이트

**Files:**
- Modify: `src/data/dev-mock.ts`

- [ ] **Step 1: import에 `CityStay` 추가**

파일 상단 import를 수정:

```typescript
import type {
  ChecklistItem,
  Circle,
  City,
  CityStay,
  LocalEventRec,
  MovePlan,
  PlannerBoard,
  PlannerTask,
  PioneerMilestone,
  Post,
  Profile,
  User,
  WandererHop,
} from '@/types/api';
```

- [ ] **Step 2: `wandererHops` mock 데이터 교체**

기존 `let wandererHops` 선언을 아래로 교체:

```typescript
let wandererHops: WandererHop[] = [
  {
    id: 1,
    from_country: 'Thailand',
    to_country: 'Vietnam',
    to_city: 'Da Nang',
    note: null,
    target_month: '2026-05',
    status: 'booked',
    conditions: [
      { id: 'flight', label: tx('항공권 예매', 'Book flight'), is_done: true },
      { id: 'accommodation', label: tx('숙소 확보', 'Book accommodation'), is_done: false },
    ],
    is_focus: true,
  },
  {
    id: 2,
    from_country: 'Vietnam',
    to_country: 'Taiwan',
    to_city: 'Taipei',
    note: null,
    target_month: '2026-07',
    status: 'planned',
    conditions: [],
    is_focus: false,
  },
  {
    id: 3,
    from_country: 'Taiwan',
    to_country: 'Japan',
    to_city: 'Tokyo',
    note: null,
    target_month: '2026-09',
    status: 'planned',
    conditions: [],
    is_focus: false,
  },
];
```

- [ ] **Step 3: `cityStays` mock 데이터 추가**

`wandererHops` 선언 바로 아래에 추가:

```typescript
let cityStays: CityStay[] = [
  {
    id: 1,
    city: 'Bangkok',
    country: 'Thailand',
    arrived_at: '2025-02-01',
    left_at: null,
    visa_expires_at: '2026-04-19',
    budget_total: 1200,
    budget_remaining: 840,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 63).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    city: 'Lisbon',
    country: 'Portugal',
    arrived_at: '2024-11-01',
    left_at: '2025-01-20',
    visa_expires_at: null,
    budget_total: null,
    budget_remaining: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 155).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 75).toISOString(),
  },
  {
    id: 3,
    city: 'Chiang Mai',
    country: 'Thailand',
    arrived_at: '2024-08-15',
    left_at: '2024-10-30',
    visa_expires_at: null,
    budget_total: null,
    budget_remaining: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 233).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 158).toISOString(),
  },
];
```

- [ ] **Step 4: `devMockApiRequest` 함수에 city_stays 핸들러 추가**

기존 `if (method === 'GET' && pathname === '/api/mobile/type-actions/pioneer/milestones')` 블록 앞에 추가:

```typescript
  if (method === 'GET' && pathname === '/api/mobile/city-stays') {
    return cityStays as T;
  }

  if (method === 'POST' && pathname === '/api/mobile/city-stays') {
    const body = JSON.parse((options.body as string | undefined) ?? '{}') as {
      city?: string;
      country?: string | null;
      arrived_at?: string;
      visa_expires_at?: string | null;
      budget_total?: number | null;
      budget_remaining?: number | null;
    };
    const now = new Date().toISOString();
    const nextId = cityStays.length > 0 ? Math.max(...cityStays.map((x) => x.id)) + 1 : 1;
    const created: CityStay = {
      id: nextId,
      city: body.city?.trim() || '',
      country: body.country?.trim() || null,
      arrived_at: body.arrived_at || new Date().toISOString().slice(0, 10),
      left_at: null,
      visa_expires_at: body.visa_expires_at || null,
      budget_total: body.budget_total ?? null,
      budget_remaining: body.budget_remaining ?? null,
      created_at: now,
      updated_at: now,
    };
    cityStays = [...cityStays, created];
    return created as T;
  }

  if (method === 'PATCH' && /^\/api\/mobile\/city-stays\/\d+$/.test(pathname)) {
    const stayId = Number(pathname.split('/')[4]);
    const body = JSON.parse((options.body as string | undefined) ?? '{}') as Partial<CityStay>;
    let updated: CityStay | null = null;
    cityStays = cityStays.map((stay) => {
      if (stay.id !== stayId) return stay;
      updated = { ...stay, ...body, updated_at: new Date().toISOString() };
      return updated;
    });
    if (!updated) throw new Error(`Mock city stay not found: ${stayId}`);
    return updated as T;
  }

  if (method === 'POST' && /^\/api\/mobile\/city-stays\/\d+\/leave$/.test(pathname)) {
    const stayId = Number(pathname.split('/')[4]);
    let updated: CityStay | null = null;
    cityStays = cityStays.map((stay) => {
      if (stay.id !== stayId) return stay;
      updated = { ...stay, left_at: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() };
      return updated;
    });
    if (!updated) throw new Error(`Mock city stay not found: ${stayId}`);
    return updated as T;
  }
```

- [ ] **Step 5: wanderer hops mock 핸들러에 POST, DELETE 추가**

기존 `if (method === 'GET' && pathname === '/api/mobile/type-actions/wanderer/hops')` 블록 바로 뒤에 추가:

```typescript
  if (method === 'POST' && pathname === '/api/mobile/type-actions/wanderer/hops') {
    const body = JSON.parse((options.body as string | undefined) ?? '{}') as Partial<WandererHop>;
    const nextId = wandererHops.length > 0 ? Math.max(...wandererHops.map((x) => x.id)) + 1 : 1;
    const created: WandererHop = {
      id: nextId,
      from_country: body.from_country ?? null,
      to_country: body.to_country?.trim() || '',
      to_city: body.to_city?.trim() || null,
      note: body.note ?? null,
      target_month: body.target_month ?? null,
      status: body.status ?? 'planned',
      conditions: body.conditions ?? [],
      is_focus: body.is_focus ?? false,
    };
    wandererHops = [...wandererHops, created];
    return created as T;
  }

  if (method === 'DELETE' && /^\/api\/mobile\/type-actions\/wanderer\/hops\/\d+$/.test(pathname)) {
    const hopId = Number(pathname.split('/')[6]);
    wandererHops = wandererHops.filter((hop) => hop.id !== hopId);
    return undefined as T;
  }
```

기존 `PATCH` wanderer hops 핸들러는 이미 `...body` spread를 사용하므로 자동으로 `conditions`, `is_focus`도 처리됨. 변경 불필요.

- [ ] **Step 6: 커밋**

```bash
git add src/data/dev-mock.ts
git commit -m "feat: add city-stays mock data and handlers, update wanderer hops mock"
```

---

## Task 4: 탭 2 (city.tsx) 재작성

**Files:**
- Modify: `src/app/(tabs)/city.tsx`

- [ ] **Step 1: city.tsx 전체 교체**

```typescript
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, TextInput, View } from 'react-native';

import { createCityStay, fetchCityStays, leaveCityStay, patchCityStay } from '@/api/cities';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { CityStay } from '@/types/api';

function daysBetween(from: string, toDate: string): number {
  const a = new Date(from).getTime();
  const b = new Date(toDate).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CityScreen() {
  const theme = useTheme();
  const { t } = useI18n();

  const [stays, setStays] = useState<CityStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 편집 모드
  const [editing, setEditing] = useState(false);
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editArrivedAt, setEditArrivedAt] = useState('');
  const [editVisaExpiresAt, setEditVisaExpiresAt] = useState('');
  const [editBudgetRemaining, setEditBudgetRemaining] = useState('');
  const [saving, setSaving] = useState(false);

  // 새 도시 추가 모드 (이동 후)
  const [addingNew, setAddingNew] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newArrivedAt, setNewArrivedAt] = useState(todayISO());
  const [newVisaExpiresAt, setNewVisaExpiresAt] = useState('');
  const [newBudgetRemaining, setNewBudgetRemaining] = useState('');

  // 지나온 도시 접기
  const [pastExpanded, setPastExpanded] = useState(false);

  const currentStay = useMemo(
    () => stays.find((s) => s.left_at === null) ?? null,
    [stays],
  );
  const pastStays = useMemo(
    () =>
      stays
        .filter((s) => s.left_at !== null)
        .sort((a, b) => new Date(b.arrived_at).getTime() - new Date(a.arrived_at).getTime()),
    [stays],
  );

  const today = useMemo(() => todayISO(), []);
  const daysStayed = useMemo(
    () => (currentStay ? daysBetween(currentStay.arrived_at, today) : null),
    [currentStay, today],
  );
  const visaDaysLeft = useMemo(() => {
    if (!currentStay?.visa_expires_at) return null;
    const diff = Math.floor(
      (new Date(currentStay.visa_expires_at).getTime() - new Date(today).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return diff;
  }, [currentStay, today]);

  const loadStays = useCallback(async () => {
    const data = await fetchCityStays();
    setStays(data);
  }, []);

  useEffect(() => {
    loadStays()
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('불러오기 실패', 'Failed to load'));
      })
      .finally(() => setLoading(false));
  }, [loadStays, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadStays();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('새로고침 실패', 'Refresh failed'));
    } finally {
      setRefreshing(false);
    }
  }, [loadStays, t]);

  const onStartEdit = useCallback(() => {
    if (!currentStay) return;
    setEditCity(currentStay.city);
    setEditCountry(currentStay.country ?? '');
    setEditArrivedAt(currentStay.arrived_at);
    setEditVisaExpiresAt(currentStay.visa_expires_at ?? '');
    setEditBudgetRemaining(currentStay.budget_remaining != null ? String(currentStay.budget_remaining) : '');
    setEditing(true);
  }, [currentStay]);

  const onSaveEdit = useCallback(async () => {
    if (!currentStay || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patchCityStay(currentStay.id, {
        city: editCity.trim(),
        country: editCountry.trim() || null,
        arrived_at: editArrivedAt.trim(),
        visa_expires_at: editVisaExpiresAt.trim() || null,
        budget_remaining: editBudgetRemaining.trim() ? Number(editBudgetRemaining) : null,
      });
      setStays((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('저장 실패', 'Save failed'));
    } finally {
      setSaving(false);
    }
  }, [currentStay, editArrivedAt, editBudgetRemaining, editCity, editCountry, editVisaExpiresAt, saving, t]);

  const onLeave = useCallback(async () => {
    if (!currentStay || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await leaveCityStay(currentStay.id);
      setStays((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setAddingNew(true);
      setNewArrivedAt(todayISO());
      setNewCity('');
      setNewCountry('');
      setNewVisaExpiresAt('');
      setNewBudgetRemaining('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('이동 처리 실패', 'Failed to leave'));
    } finally {
      setSaving(false);
    }
  }, [currentStay, saving, t]);

  const onCreateNew = useCallback(async () => {
    if (!newCity.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createCityStay({
        city: newCity.trim(),
        country: newCountry.trim() || null,
        arrived_at: newArrivedAt.trim() || todayISO(),
        visa_expires_at: newVisaExpiresAt.trim() || null,
        budget_remaining: newBudgetRemaining.trim() ? Number(newBudgetRemaining) : null,
      });
      setStays((prev) => [...prev, created]);
      setAddingNew(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('저장 실패', 'Save failed'));
    } finally {
      setSaving(false);
    }
  }, [newArrivedAt, newBudgetRemaining, newCity, newCountry, newVisaExpiresAt, saving, t]);

  const card = {
    backgroundColor: theme.backgroundElement,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 10,
  } as const;

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.text,
    fontSize: 13,
    fontFamily: 'monospace',
  } as const;

  const btnStyle = {
    alignSelf: 'flex-start' as const,
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.backgroundSelected,
    paddingHorizontal: 12,
    paddingVertical: 6,
  };

  return (
    <ScreenShell
      eyebrow={t('도시', 'City')}
      title={t('현재 체류', 'Current Stay')}
      subtitle={t('지금 머무는 도시와 비자, 예산을 관리하세요.', 'Track your current city, visa, and budget.')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>

      {error ? (
        <View style={card}>
          <ThemedText style={{ fontSize: 13, color: theme.destructive }}>{error}</ThemedText>
        </View>
      ) : null}

      {/* 현재 도시 없고 추가 모드 아닐 때 */}
      {!loading && !currentStay && !addingNew ? (
        <View style={card}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            {t('현재 도시가 없습니다.', 'No current city set.')}
          </ThemedText>
          <Pressable onPress={() => setAddingNew(true)} style={btnStyle}>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
              {t('도시 추가', 'Add City')}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* 새 도시 추가 폼 */}
      {addingNew ? (
        <View style={card}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
            {t('새 도시 입력', 'New City')}
          </ThemedText>
          <TextInput
            value={newCity}
            onChangeText={setNewCity}
            placeholder={t('도시명 (예: Bangkok)', 'City (e.g. Bangkok)')}
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={newCountry}
            onChangeText={setNewCountry}
            placeholder={t('국가 (예: Thailand)', 'Country (e.g. Thailand)')}
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={newArrivedAt}
            onChangeText={setNewArrivedAt}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={newVisaExpiresAt}
            onChangeText={setNewVisaExpiresAt}
            placeholder={t('비자 만료일 YYYY-MM-DD (선택)', 'Visa expiry YYYY-MM-DD (optional)')}
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={newBudgetRemaining}
            onChangeText={setNewBudgetRemaining}
            placeholder={t('잔여 예산 USD (선택)', 'Remaining budget USD (optional)')}
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            style={inputStyle}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => void onCreateNew()} disabled={saving || !newCity.trim()} style={[btnStyle, { opacity: saving || !newCity.trim() ? 0.6 : 1 }]}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
                {saving ? t('저장 중...', 'Saving...') : t('저장', 'Save')}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setAddingNew(false)} style={{ ...btnStyle, borderColor: theme.border }}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>
                {t('취소', 'Cancel')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* 현재 도시 카드 */}
      {currentStay && !addingNew ? (
        <View style={card}>
          {editing ? (
            <>
              <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
                {t('정보 수정', 'Edit Info')}
              </ThemedText>
              <TextInput value={editCity} onChangeText={setEditCity} placeholder={t('도시명', 'City')} placeholderTextColor={theme.textSecondary} style={inputStyle} />
              <TextInput value={editCountry} onChangeText={setEditCountry} placeholder={t('국가', 'Country')} placeholderTextColor={theme.textSecondary} style={inputStyle} />
              <TextInput value={editArrivedAt} onChangeText={setEditArrivedAt} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} style={inputStyle} />
              <TextInput value={editVisaExpiresAt} onChangeText={setEditVisaExpiresAt} placeholder={t('비자 만료일 YYYY-MM-DD', 'Visa expiry YYYY-MM-DD')} placeholderTextColor={theme.textSecondary} style={inputStyle} />
              <TextInput value={editBudgetRemaining} onChangeText={setEditBudgetRemaining} placeholder={t('잔여 예산 USD', 'Remaining budget USD')} placeholderTextColor={theme.textSecondary} keyboardType="numeric" style={inputStyle} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => void onSaveEdit()} disabled={saving} style={[btnStyle, { opacity: saving ? 0.6 : 1 }]}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
                    {saving ? t('저장 중...', 'Saving...') : t('저장', 'Save')}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => setEditing(false)} style={{ ...btnStyle, borderColor: theme.border }}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>
                    {t('취소', 'Cancel')}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1 }}>
                {t('현재 도시', 'CURRENT CITY')}
              </ThemedText>
              <ThemedText style={{ fontSize: 20, fontWeight: '700' }}>
                {currentStay.city}{currentStay.country ? `, ${currentStay.country}` : ''}
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                {t('from', 'from')} {currentStay.arrived_at}
                {currentStay.visa_expires_at ? ` · ${t('비자 만료', 'visa exp.')} ${currentStay.visa_expires_at}` : ''}
              </ThemedText>

              {/* 3개 위젯 */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, padding: 10, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>{t('체류', 'DAYS')}</ThemedText>
                  <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>{daysStayed ?? '—'}</ThemedText>
                </View>
                <View style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: visaDaysLeft != null && visaDaysLeft <= 30 ? theme.destructive : theme.border,
                  backgroundColor: theme.background,
                  padding: 10,
                  alignItems: 'center',
                }}>
                  <ThemedText style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>{t('비자', 'VISA')}</ThemedText>
                  <ThemedText style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: visaDaysLeft != null && visaDaysLeft <= 30 ? theme.destructive : theme.text,
                  }}>
                    {visaDaysLeft != null ? `D-${visaDaysLeft}` : '—'}
                  </ThemedText>
                </View>
                <View style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: currentStay.budget_remaining != null ? theme.accent : theme.border,
                  backgroundColor: theme.background,
                  padding: 10,
                  alignItems: 'center',
                }}>
                  <ThemedText style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>{t('예산', 'BUDGET')}</ThemedText>
                  <ThemedText style={{ fontSize: 18, fontWeight: '700', color: currentStay.budget_remaining != null ? theme.accent : theme.text }}>
                    {currentStay.budget_remaining != null ? `$${currentStay.budget_remaining}` : '—'}
                  </ThemedText>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={onStartEdit} style={btnStyle}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
                    {t('수정', 'Edit')}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => void onLeave()} disabled={saving} style={[{ ...btnStyle, borderColor: theme.destructive, backgroundColor: 'transparent' }, { opacity: saving ? 0.6 : 1 }]}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.destructive }}>
                    {saving ? t('처리 중...', 'Processing...') : t('이 도시 떠나기', 'Leave City')}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : null}

      {/* 지나온 도시 */}
      {pastStays.length > 0 ? (
        <View style={card}>
          <Pressable onPress={() => setPastExpanded((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>
              {t('지나온 도시', 'Past Cities')} · {pastStays.length}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{pastExpanded ? '▲' : '▼'}</ThemedText>
          </Pressable>

          {pastExpanded ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              {pastStays.map((stay, idx) => {
                const days = stay.left_at ? daysBetween(stay.arrived_at, stay.left_at) : null;
                return (
                  <View
                    key={stay.id}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      padding: 10,
                      opacity: Math.max(0.4, 1 - idx * 0.15),
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                    <View style={{ gap: 2 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
                        {stay.city}{stay.country ? `, ${stay.country}` : ''}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
                        {stay.arrived_at} – {stay.left_at}
                      </ThemedText>
                    </View>
                    {days != null ? (
                      <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>{days}{t('일', 'd')}</ThemedText>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScreenShell>
  );
}
```

- [ ] **Step 2: 시뮬레이터에서 탭 2 확인**

시뮬레이터의 두 번째 탭을 열고 아래를 확인:
- 현재 도시 카드(Bangkok)와 3개 위젯(체류일, 비자 D-day, 예산)이 표시됨
- 비자 D-day가 30일 이하이면 빨간색
- "수정" 버튼 탭 → 편집 폼 표시 → 저장 동작
- "이 도시 떠나기" 탭 → 새 도시 입력 폼 표시
- "▼ 지나온 도시 · 2" 탭 → Lisbon, Chiang Mai 목록 펼침

- [ ] **Step 3: 커밋**

```bash
git add src/app/(tabs)/city.tsx
git commit -m "feat: rewrite city tab with current stay, visa d-day, budget and past cities"
```

---

## Task 5: Me 탭 Wanderer 섹션 교체

**Files:**
- Modify: `src/app/(tabs)/me.tsx`

- [ ] **Step 1: import 수정**

`src/app/(tabs)/me.tsx` 상단 import에 추가:

```typescript
import {
  createWandererHop,
  deleteWandererHop,
  fetchWandererHops,
  patchWandererHop,
  // 나머지 기존 import 유지
} from '@/api/type-actions';
import { fetchCityStays } from '@/api/cities';
import type {
  CityStay,
  WandererHop,
  WandererHopCondition,
  // 나머지 기존 type import 유지
} from '@/types/api';
```

- [ ] **Step 2: me.tsx의 wanderer 관련 state 추가**

기존 `const [wandererHops, setWandererHops] = useState<WandererHop[]>([]);` 아래에 추가:

```typescript
const [currentStay, setCurrentStay] = useState<CityStay | null>(null);
const [addingHop, setAddingHop] = useState(false);
const [newHopCity, setNewHopCity] = useState('');
const [newHopCountry, setNewHopCountry] = useState('');
```

- [ ] **Step 3: `loadData` 함수 내 wanderer 분기에 currentStay 로딩 추가**

기존 `if (currentType === 'wanderer')` 블록을 교체:

```typescript
    if (currentType === 'wanderer') {
      const [hops, stays] = await Promise.all([
        fetchWandererHops(),
        fetchCityStays(),
      ]);
      setWandererHops(hops);
      setCurrentStay(stays.find((s) => s.left_at === null) ?? null);
      return;
    }
```

- [ ] **Step 4: wanderer 렌더 함수 교체**

`renderTypeAction` 함수 내 `if (nomadType === 'wanderer')` 블록을 아래로 교체:

```typescript
    if (nomadType === 'wanderer') {
      const focusHop = wandererHops.find((h) => h.is_focus) ?? wandererHops[0] ?? null;
      const candidateHops = wandererHops.filter((h) => h !== focusHop);

      // 자동 조건 계산
      const visaAutoOk = focusHop
        ? ['Vietnam', 'Taiwan', 'Japan', 'Thailand', 'Portugal', 'Germany', 'France', 'Spain'].includes(focusHop.to_country)
        : false;
      const budgetAutoOk = currentStay?.budget_remaining != null && currentStay.budget_remaining > 0;

      const autoConditions = focusHop
        ? [
            { id: '__visa__', label: t('비자 무비자 확인', 'Visa-free check'), is_done: visaAutoOk },
            { id: '__budget__', label: t('예산 충분', 'Budget sufficient'), is_done: budgetAutoOk },
          ]
        : [];

      const allConditions = focusHop
        ? [...autoConditions, ...focusHop.conditions]
        : [];
      const fulfilledCount = allConditions.filter((c) => c.is_done).length;
      const totalCount = allConditions.length;
      const progressPct = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0;

      const onToggleCondition = async (conditionId: string) => {
        if (!focusHop) return;
        const updated = focusHop.conditions.map((c) =>
          c.id === conditionId ? { ...c, is_done: !c.is_done } : c,
        );
        try {
          const result = await patchWandererHop(focusHop.id, { conditions: updated });
          setWandererHops((prev) => prev.map((h) => (h.id === result.id ? result : h)));
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t('업데이트 실패', 'Failed to update.'));
        }
      };

      const onSetFocus = async (hopId: number) => {
        try {
          const updates = await Promise.all(
            wandererHops.map((h) =>
              patchWandererHop(h.id, { is_focus: h.id === hopId }),
            ),
          );
          setWandererHops(updates);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t('업데이트 실패', 'Failed to update.'));
        }
      };

      const onAddHop = async () => {
        if (!newHopCity.trim() || !newHopCountry.trim()) return;
        try {
          const created = await createWandererHop({
            to_city: newHopCity.trim(),
            to_country: newHopCountry.trim(),
            status: 'planned',
            conditions: [],
            is_focus: wandererHops.length === 0,
          });
          setWandererHops((prev) => [...prev, created]);
          setNewHopCity('');
          setNewHopCountry('');
          setAddingHop(false);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t('추가 실패', 'Failed to add hop.'));
        }
      };

      const onDeleteHop = async (hopId: number) => {
        try {
          await deleteWandererHop(hopId);
          setWandererHops((prev) => prev.filter((h) => h.id !== hopId));
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t('삭제 실패', 'Failed to delete hop.'));
        }
      };

      return (
        <View style={cardStyle(theme)}>
          {/* 포커스 행선지 */}
          {focusHop ? (
            <>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.accent, letterSpacing: 1 }}>
                {t('다음 행선지', 'NEXT DESTINATION')}
              </ThemedText>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* 원형 프로그레스 */}
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 3,
                  borderColor: progressPct === 100 ? theme.accent : theme.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: progressPct === 100 ? theme.accent : theme.text }}>
                    {progressPct}%
                  </ThemedText>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>
                    {focusHop.to_city ? `${focusHop.to_city}, ` : ''}{focusHop.to_country}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: theme.accent }}>
                    {focusHop.status.toUpperCase()}{focusHop.target_month ? ` · ${focusHop.target_month}` : ''}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
                    {t('조건', 'Conditions')} {fulfilledCount}/{totalCount}
                  </ThemedText>
                </View>
              </View>

              {/* 조건 태그 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {autoConditions.map((c) => (
                  <View
                    key={c.id}
                    style={{
                      borderWidth: 1,
                      borderColor: c.is_done ? theme.accent : theme.border,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: c.is_done ? theme.accent : theme.textSecondary }}>
                      {c.is_done ? '✓ ' : '✗ '}{c.label}
                    </ThemedText>
                  </View>
                ))}
                {focusHop.conditions.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => void onToggleCondition(c.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: c.is_done ? theme.accent : theme.border,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: c.is_done ? theme.accent : theme.textSecondary }}>
                      {c.is_done ? '✓ ' : '○ '}{c.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
              {t('행선지 후보가 없습니다.', 'No destination set yet.')}
            </ThemedText>
          )}

          {/* 후보 도시 */}
          {candidateHops.length > 0 ? (
            <View style={{ gap: 6 }}>
              <ThemedText style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '700' }}>
                {t('후보', 'CANDIDATES')}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {candidateHops.map((hop) => (
                  <Pressable
                    key={hop.id}
                    onPress={() => void onSetFocus(hop.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      opacity: 0.7,
                    }}>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>
                      {hop.to_city ?? hop.to_country}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10, color: theme.textSecondary }}>
                      {hop.status}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* 새 행선지 추가 */}
          {addingHop ? (
            <View style={{ gap: 8 }}>
              <TextInput
                value={newHopCity}
                onChangeText={setNewHopCity}
                placeholder={t('도시 (예: Da Nang)', 'City (e.g. Da Nang)')}
                placeholderTextColor={theme.textSecondary}
                style={inputStyle(theme)}
              />
              <TextInput
                value={newHopCountry}
                onChangeText={setNewHopCountry}
                placeholder={t('국가 (예: Vietnam)', 'Country (e.g. Vietnam)')}
                placeholderTextColor={theme.textSecondary}
                style={inputStyle(theme)}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => void onAddHop()} style={buttonStyle(theme)}>
                  <ThemedText style={buttonTextStyle(theme)}>{t('추가', 'Add')}</ThemedText>
                </Pressable>
                <Pressable onPress={() => setAddingHop(false)} style={{ ...buttonStyle(theme), borderColor: theme.border }}>
                  <ThemedText style={{ ...buttonTextStyle(theme), color: theme.textSecondary }}>{t('취소', 'Cancel')}</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAddingHop(true)} style={buttonStyle(theme)}>
              <ThemedText style={buttonTextStyle(theme)}>
                {t('+ 행선지 추가', '+ Add Destination')}
              </ThemedText>
            </Pressable>
          )}
        </View>
      );
    }
```

- [ ] **Step 5: 시뮬레이터에서 Me 탭 Wanderer 확인**

프로필의 nomad_type을 `'wanderer'`로 변경 (`src/data/dev-mock.ts`의 `profile.nomad_type`)하고:
- 포커스 행선지 Da Nang이 큰 카드로 표시됨
- 원형 프로그레스에 조건 충족 % 표시
- 비자/예산 자동 태그(✓/✗)와 수동 조건 태그 표시
- 수동 조건 탭하면 토글됨
- 후보 도시(Taipei, Tokyo) 탭하면 포커스 교체됨
- "+ 행선지 추가" 탭하면 입력 폼 표시됨

확인 후 `profile.nomad_type`을 원래 값으로 복구.

- [ ] **Step 6: 커밋**

```bash
git add src/app/(tabs)/me.tsx
git commit -m "feat: replace wanderer Me tab with focus destination and conditions tracker"
```
