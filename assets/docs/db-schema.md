# NomadNavigator AI — DB Schema Reference

> 프론트엔드 개발자용 데이터베이스 스키마 레퍼런스
> DB: PostgreSQL (Railway)
> 정의 위치: `utils/db.py` → `init_db()`
> 최종 업데이트: 2026-04-01

---

## 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `users` | Google OAuth 로그인 유저 |
| `pins` | 유저가 저장한 관심 도시 |
| `visits` | 경로별 방문자 수 집계 |
| `verified_sources` | 검증 데이터 출처(소스) 목록 |
| `verified_countries` | 검증된 국가별 비자 데이터 |
| `verified_cities` | 검증된 도시별 노마드 지표 데이터 |
| `verified_city_sources` | 도시-소스 연결 (N:M) |
| `verification_logs` | 데이터 검증 작업 이력 |

---

## users

Google OAuth 콜백 시 자동 upsert됩니다.

```sql
CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,   -- Google OAuth sub (유저 고유 ID)
    email      TEXT,               -- 구글 이메일
    name       TEXT,               -- 구글 이름
    picture    TEXT,               -- 프로필 이미지 URL
    created_at TEXT                -- ISO 8601 타임스탬프 (UTC)
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | Google OAuth `sub` 값 |
| `email` | TEXT | 구글 계정 이메일 |
| `name` | TEXT | 구글 계정 이름 |
| `picture` | TEXT | 구글 프로필 이미지 URL |
| `created_at` | TEXT | 최초 로그인 시각 (ISO 8601 UTC) |

**참고:** `ON CONFLICT(id) DO UPDATE` — 재로그인 시 email/name/picture 갱신.

---

## pins

유저가 저장한 관심 도시. `user_id`는 `users.id`를 외래키로 참조합니다.

```sql
CREATE TABLE IF NOT EXISTS pins (
    id         SERIAL PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    city       TEXT NOT NULL,    -- 도시명 (한국어 또는 영어)
    display    TEXT,             -- 표시명 (예: "Bangkok, Thailand")
    note       TEXT,             -- 유저 메모
    lat        REAL NOT NULL,    -- 도시 위도
    lng        REAL NOT NULL,    -- 도시 경도
    user_lat   REAL,             -- 저장 시 유저 위치 위도 (선택)
    user_lng   REAL,             -- 저장 시 유저 위치 경도 (선택)
    created_at TEXT NOT NULL     -- ISO 8601 타임스탬프 (UTC)
);
```

| 컬럼 | 타입 | Null | 설명 |
|------|------|------|------|
| `id` | SERIAL PK | NOT NULL | 자동 증가 정수 ID |
| `user_id` | TEXT FK | NOT NULL | `users.id` 참조 |
| `city` | TEXT | NOT NULL | 도시명 |
| `display` | TEXT | NULL 가능 | 표시용 이름 (예: `"Bangkok, Thailand"`) |
| `note` | TEXT | NULL 가능 | 유저 메모 |
| `lat` | REAL | NOT NULL | 도시 위도 |
| `lng` | REAL | NOT NULL | 도시 경도 |
| `user_lat` | REAL | NULL 가능 | 저장 시점의 유저 위치 위도 |
| `user_lng` | REAL | NULL 가능 | 저장 시점의 유저 위치 경도 |
| `created_at` | TEXT | NOT NULL | 저장 시각 (ISO 8601 UTC) |

---

## visits

경로별 누적 방문 횟수. `POST /api/visits/ping` 호출 시 UPSERT로 관리됩니다.

```sql
CREATE TABLE IF NOT EXISTS visits (
    path       TEXT PRIMARY KEY,       -- 집계 경로 (예: "/dev")
    count      BIGINT NOT NULL DEFAULT 0,  -- 누적 방문 횟수
    updated_at TEXT NOT NULL           -- 마지막 방문 시각 (ISO 8601 UTC)
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `path` | TEXT PK | 집계 경로 (예: `"/dev"`, `"/"`) |
| `count` | BIGINT | 누적 방문 횟수 (UPSERT로 +1) |
| `updated_at` | TEXT | 마지막 ping 시각 (ISO 8601 UTC) |

**참고:** 유저 인증 없이 집계됩니다. 경로별 독립 집계.

---

## verified_sources

검증 데이터의 출처(소스)를 관리합니다. `metric_scope`는 해당 소스가 커버하는 지표 목록입니다.

```sql
CREATE TABLE IF NOT EXISTS verified_sources (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    publisher     TEXT,
    url           TEXT NOT NULL,
    metric_scope  JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_checked  TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| 컬럼 | 타입 | Null | 설명 |
|------|------|------|------|
| `id` | TEXT PK | NOT NULL | 소스 고유 ID |
| `name` | TEXT | NOT NULL | 소스 이름 |
| `publisher` | TEXT | NULL 가능 | 발행 기관 |
| `url` | TEXT | NOT NULL | 소스 URL |
| `metric_scope` | JSONB | NOT NULL | 커버 지표 목록 (기본값: `[]`) |
| `last_checked` | TEXT | NULL 가능 | 마지막 확인 일자 (ISO 8601) |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 레코드 갱신 시각 (기본값: NOW()) |

---

## verified_countries

공식 소스에서 검증된 국가별 비자 정보입니다.

```sql
CREATE TABLE IF NOT EXISTS verified_countries (
    country_id                 TEXT PRIMARY KEY,
    name                       TEXT NOT NULL,
    name_kr                    TEXT,
    visa_type                  TEXT NOT NULL,
    min_income_usd             DOUBLE PRECISION,
    stay_months                INTEGER,
    renewable                  BOOLEAN,
    visa_fee_usd               DOUBLE PRECISION,
    source_url                 TEXT,
    data_verified_date         TEXT,
    is_verified                BOOLEAN NOT NULL DEFAULT TRUE,
    raw_data                   JSONB NOT NULL,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| 컬럼 | 타입 | Null | 설명 |
|------|------|------|------|
| `country_id` | TEXT PK | NOT NULL | ISO-2 국가 코드 |
| `name` | TEXT | NOT NULL | 국가명 (영어) |
| `name_kr` | TEXT | NULL 가능 | 국가명 (한국어) |
| `visa_type` | TEXT | NOT NULL | 비자 유형 |
| `min_income_usd` | DOUBLE PRECISION | NULL 가능 | 최소 소득 요건 (USD) |
| `stay_months` | INTEGER | NULL 가능 | 허용 체류 기간 (개월) |
| `renewable` | BOOLEAN | NULL 가능 | 비자 갱신 가능 여부 |
| `visa_fee_usd` | DOUBLE PRECISION | NULL 가능 | 비자 수수료 (USD) |
| `source_url` | TEXT | NULL 가능 | 공식 출처 URL |
| `data_verified_date` | TEXT | NULL 가능 | 데이터 검증 일자 (ISO 8601) |
| `is_verified` | BOOLEAN | NOT NULL | 검증 완료 여부 (기본값: TRUE) |
| `raw_data` | JSONB | NOT NULL | 원본 데이터 전체 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 레코드 갱신 시각 (기본값: NOW()) |

---

## verified_cities

공식 소스에서 검증된 도시별 노마드 지표입니다.

```sql
CREATE TABLE IF NOT EXISTS verified_cities (
    city_id                    TEXT PRIMARY KEY,
    city                       TEXT NOT NULL,
    city_kr                    TEXT,
    country                    TEXT,
    country_id                 TEXT NOT NULL,
    monthly_cost_usd           DOUBLE PRECISION,
    internet_mbps              DOUBLE PRECISION,
    safety_score               DOUBLE PRECISION,
    english_score              DOUBLE PRECISION,
    nomad_score                DOUBLE PRECISION,
    tax_residency_days         INTEGER,
    data_verified_date         TEXT,
    is_verified                BOOLEAN NOT NULL DEFAULT TRUE,
    raw_data                   JSONB NOT NULL,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| 컬럼 | 타입 | Null | 설명 |
|------|------|------|------|
| `city_id` | TEXT PK | NOT NULL | 도시 고유 ID |
| `city` | TEXT | NOT NULL | 도시명 (영어) |
| `city_kr` | TEXT | NULL 가능 | 도시명 (한국어) |
| `country` | TEXT | NULL 가능 | 국가명 (영어) |
| `country_id` | TEXT | NOT NULL | ISO-2 국가 코드 (인덱스 있음) |
| `monthly_cost_usd` | DOUBLE PRECISION | NULL 가능 | 월 생활비 (USD) |
| `internet_mbps` | DOUBLE PRECISION | NULL 가능 | 인터넷 속도 (Mbps) |
| `safety_score` | DOUBLE PRECISION | NULL 가능 | 안전 점수 |
| `english_score` | DOUBLE PRECISION | NULL 가능 | 영어 통용도 점수 |
| `nomad_score` | DOUBLE PRECISION | NULL 가능 | 노마드 종합 점수 |
| `tax_residency_days` | INTEGER | NULL 가능 | 세금 거주지 기준 체류 일수 |
| `data_verified_date` | TEXT | NULL 가능 | 데이터 검증 일자 (ISO 8601) |
| `is_verified` | BOOLEAN | NOT NULL | 검증 완료 여부 (기본값: TRUE) |
| `raw_data` | JSONB | NOT NULL | 원본 데이터 전체 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 레코드 갱신 시각 (기본값: NOW()) |

---

## verified_city_sources

도시와 소스 간 N:M 관계를 관리합니다. 도시 또는 소스 삭제 시 연결 레코드도 CASCADE 삭제됩니다.

```sql
CREATE TABLE IF NOT EXISTS verified_city_sources (
    city_id       TEXT NOT NULL REFERENCES verified_cities(city_id) ON DELETE CASCADE,
    source_id     TEXT NOT NULL REFERENCES verified_sources(id) ON DELETE CASCADE,
    linked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (city_id, source_id)
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `city_id` | TEXT FK PK | `verified_cities.city_id` 참조 |
| `source_id` | TEXT FK PK | `verified_sources.id` 참조 |
| `linked_at` | TIMESTAMPTZ | 연결 시각 (기본값: NOW()) |

---

## verification_logs

데이터 검증 작업의 전체 이력을 기록합니다.

```sql
CREATE TABLE IF NOT EXISTS verification_logs (
    id            BIGSERIAL PRIMARY KEY,
    entity_type   TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    action        TEXT NOT NULL,
    source_id     TEXT,
    verified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes         TEXT,
    payload       JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

| 컬럼 | 타입 | Null | 설명 |
|------|------|------|------|
| `id` | BIGSERIAL PK | NOT NULL | 자동 증가 ID |
| `entity_type` | TEXT | NOT NULL | 대상 엔티티 타입 (예: `"city"`, `"country"`) |
| `entity_id` | TEXT | NOT NULL | 대상 엔티티 ID (복합 인덱스 있음) |
| `action` | TEXT | NOT NULL | 수행 작업 (예: `"create"`, `"update"`, `"verify"`) |
| `source_id` | TEXT | NULL 가능 | 관련 소스 ID |
| `verified_at` | TIMESTAMPTZ | NOT NULL | 작업 시각 (기본값: NOW()) |
| `notes` | TEXT | NULL 가능 | 비고 |
| `payload` | JSONB | NOT NULL | 작업 상세 데이터 (기본값: `{}`) |

---

## 인덱스

| 인덱스 | 대상 테이블 | 컬럼 | 용도 |
|--------|------------|------|------|
| `idx_verified_cities_country_id` | `verified_cities` | `country_id` | 국가별 도시 조회 최적화 |
| `idx_verification_logs_entity` | `verification_logs` | `(entity_type, entity_id)` | 엔티티별 로그 조회 최적화 |

---

## 관계

```
users (id)
  └── pins (user_id) — 1:N

visits — 독립 테이블 (외래키 없음)

verified_sources (id)
  └── verified_city_sources (source_id) — 1:N

verified_cities (city_id)
  └── verified_city_sources (city_id) — 1:N

verified_city_sources — verified_cities ↔ verified_sources N:M 연결 테이블

verification_logs — 독립 로그 테이블 (외래키 없음)
```

---

## 연결 정보

| 항목 | 값 |
|------|-----|
| 호스트 | Railway PostgreSQL |
| 환경변수 | `DATABASE_URL` |
| 연결 방식 | 앱 싱글턴 (`utils/db.get_conn()`) |
| autocommit | `False` — 모든 쓰기 후 `conn.commit()` 필요 |
