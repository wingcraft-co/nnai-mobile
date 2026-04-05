# City Stays + Wanderer 재설계 스펙

**날짜:** 2026-04-05  
**작성자:** Rosie  
**상태:** 승인됨

---

## 개요

두 가지 변경을 포함한다:

1. **탭 2 (City) 전면 재설계** — 모든 노마드 타입이 공통으로 사용하는 "현재 체류 도시 + 지나온 도시 히스토리 + 예산 + 비자 D-day" 화면
2. **Me 탭 Wanderer 전용 기능 교체** — 기존 홉 목록 → 다음 행선지 포커스 + 조건 충족 관리

---

## 탭 2 — City (모든 타입 공통)

### 화면 구조

#### 현재 도시 카드 (상단)

- 도시명 + 국가 (텍스트 입력)
- 체류 시작일 (`arrived_at`) 날짜 입력
- 비자 만료일 (`visa_expires_at`) 날짜 입력
- 3개 숫자 위젯:
  - **체류일**: `today - arrived_at` 자동 계산
  - **비자 D-day**: `visa_expires_at - today` 자동 계산, 30일 이하이면 빨간색
  - **잔여 예산**: 직접 입력 (USD)
- "새 도시로 이동" 버튼 → 현재 city_stay의 `left_at`을 오늘로 설정하고 새 항목 생성 유도

#### 지나온 도시 섹션 (하단, 접었다 펼치기)

- 기본 상태: 접힘 (`▼ 지나온 도시 · N`)
- 펼치면: 과거 city_stay 목록 (최신 순)
  - 각 항목: 도시명, 국가, 체류 기간 (`arrived_at ~ left_at`), 총 체류일
  - 오래될수록 약간 흐리게 (opacity)

### 데이터 모델 — 신규 테이블 `city_stays`

```sql
CREATE TABLE IF NOT EXISTS city_stays (
    id               BIGSERIAL PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city             TEXT NOT NULL,
    country          TEXT,
    arrived_at       DATE NOT NULL,
    left_at          DATE,                        -- NULL이면 현재 도시
    visa_expires_at  DATE,
    budget_total     DOUBLE PRECISION,
    budget_remaining DOUBLE PRECISION,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `left_at = NULL` → 현재 도시 (유저당 1개만 존재해야 함)
- `left_at != NULL` → 지나온 도시

### API 엔드포인트 — `/api/mobile/city-stays`

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/mobile/city-stays` | 전체 목록 (현재 + 과거) |
| `POST` | `/api/mobile/city-stays` | 새 현재 도시 생성 |
| `PATCH` | `/api/mobile/city-stays/{id}` | 현재 도시 정보 수정 (비자일, 예산 등) |
| `POST` | `/api/mobile/city-stays/{id}/leave` | `left_at` = 오늘로 설정 (과거로 전환) |

모든 엔드포인트는 `Authorization: Bearer <jwt>` 필수.

---

## Me 탭 — Wanderer 전용

### 화면 구조

#### 프로필 카드 (기존 유지)

캐릭터 아바타, 타입명, 이름 — 변경 없음.

#### 다음 행선지 포커스 카드 (신규)

**포커스 행선지 (1개, 크게)**

- 도시명 + 국가
- 원형 프로그레스 인디케이터: 조건 충족 % (충족 수 / 전체 조건 수)
- 조건 목록 (태그 형태):
  - **비자** (자동): 한국 여권 기준 무비자 여부 — `verified_countries` 데이터 활용
  - **예산** (자동): city_stays의 `budget_remaining` ≥ 해당 도시 예상 생활비 (`verified_cities.monthly_cost_usd`) 비교
  - **커스텀 항목**: 항공권 예매, 숙소 확보 등 유저가 직접 추가/체크

**후보 도시 (하단, 작게)**

- 최대 3개의 후보 도시를 작은 카드로 표시
- 각각 조건 충족 % 표시
- 탭하면 포커스 행선지와 교체

**행선지 추가 버튼**

- "+ 행선지 후보 추가" → 도시명 입력

### 데이터 모델 — `wanderer_hops` 수정

**변경 사항:**

1. `status` ENUM 변경: `planned | booked` 만 유지 (기존 `visited | dropped` 제거)
2. `conditions` JSONB 컬럼 추가: 커스텀 조건 항목 저장
3. `is_focus` BOOLEAN 추가 (DEFAULT FALSE): 현재 포커스 행선지 여부

```sql
-- 마이그레이션
ALTER TABLE wanderer_hops
    ADD COLUMN conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN is_focus   BOOLEAN NOT NULL DEFAULT FALSE;

-- status CHECK 제약 업데이트
ALTER TABLE wanderer_hops
    DROP CONSTRAINT IF EXISTS wanderer_hops_status_check;
ALTER TABLE wanderer_hops
    ADD CONSTRAINT wanderer_hops_status_check
    CHECK (status IN ('planned', 'booked'));
```

**`conditions` JSONB 구조:**

```json
[
  { "id": "flight", "label": "항공권 예매", "is_done": false },
  { "id": "accommodation", "label": "숙소 확보", "is_done": true }
]
```

자동 조건(비자, 예산)은 DB에 저장하지 않고 프론트에서 실시간 계산.

### API 엔드포인트 — `/api/mobile/type-actions/wanderer`

기존 엔드포인트 유지, 아래 항목 추가/수정:

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `PATCH` | `/api/mobile/type-actions/wanderer/hops/{hop_id}` | `conditions`, `is_focus`, `status` 수정 가능 |

`GET /api/mobile/type-actions/wanderer/hops` 응답에 `conditions`, `is_focus` 필드 포함.

---

## 두 기능의 연결 포인트

- Wanderer의 **비자 조건 자동 체크**: `city_stays.current` 도시의 국가 → `verified_countries`에서 목적지 비자 정보 조회. 목적지 국가가 DB에 없으면 비자 조건을 수동 체크 항목으로 fallback
- Wanderer의 **예산 조건 자동 체크**: `city_stays.budget_remaining` vs `verified_cities.monthly_cost_usd`
- 포커스 행선지의 조건이 100% 충족되면 → "GO 준비 완료" 상태 표시

---

## 영향 범위

| 파일 | 변경 유형 |
|------|----------|
| `src/app/(tabs)/city.tsx` | 전면 재작성 |
| `src/app/(tabs)/me.tsx` | wanderer 섹션 교체 |
| `src/api/cities.ts` | city_stays API 함수 추가 |
| `src/api/type-actions.ts` | wanderer hops 파라미터 확장 |
| `src/types/api.ts` | `CityStay` 타입 추가, `WandererHop` 수정 |
| `assets/docs/api-reference.md` | city_stays 엔드포인트 추가 |
| `assets/docs/db-schema.md` | city_stays 테이블, wanderer_hops 변경 추가 |

---

## 백엔드 협의 필요 사항

1. `city_stays` 테이블 및 API 신규 구현
2. `wanderer_hops` 마이그레이션 (`conditions`, `is_focus` 컬럼 추가, `status` ENUM 축소)
3. `GET /api/mobile/type-actions/wanderer/hops` 응답에 신규 필드 포함
