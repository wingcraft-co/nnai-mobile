# NNAI Nomad Mobile — 개발 설계 문서

> 작성일: 2026-04-01  
> 목표: 기존 nnai 웹서비스(api.nnai.app)를 모바일로 확장, Google Play / App Store 실제 배포

---

## 1. 목표 및 제약

- 단일 코드베이스로 Android / iOS 동시 지원 (Expo + React Native)
- 기존 웹서비스 백엔드(Python, Railway) 코드에 영향 없이 모바일 기능 추가
- 기존 PostgreSQL DB 공유, 신규 테이블 추가
- 웹 인증(쿠키)과 모바일 인증(JWT)은 완전히 분리

---

## 2. 전체 아키텍처

```
[iOS / Android 앱]
      │
      │  Authorization: Bearer <JWT>
      ▼
[api.nnai.app — Python 백엔드 (Railway)]
      │
      ├── /auth/mobile/*        모바일 전용 인증
      ├── /api/mobile/*         모바일 전용 엔드포인트
      │
      └── [PostgreSQL (Railway)]
            ├── 기존 테이블 (읽기/쓰기)
            │     users, pins, verified_cities, verified_countries
            └── 신규 테이블 (추가)
                  posts, post_likes, post_comments
                  circles, circle_members
                  move_plans, move_checklist_items
                  user_badges
```

### 웹 / 모바일 분리 원칙

| 레이어 | 웹 | 모바일 |
|--------|-----|--------|
| 인증 | `nnai_session` 쿠키 | `Authorization: Bearer JWT` |
| API 경로 | `/api/*`, `/auth/google*` | `/api/mobile/*`, `/auth/mobile/*` |
| DB 테이블 | 기존 테이블 | 기존 공유 + 신규 추가 |
| 미들웨어 | `require_auth` (쿠키) | `require_mobile_auth` (JWT) |

> 기존 웹 코드는 일체 수정하지 않는다.

---

## 3. 인증 플로우

### 로그인 흐름

```
[앱] expo-auth-session으로 Google OAuth 실행
  → Google 인증 완료 → code 반환
  → POST /auth/mobile/token { code, redirect_uri }
  → 백엔드: Google에 code 검증 → users 테이블 upsert → JWT(24h) 서명
  → 앱: JWT를 expo-secure-store에 저장
  → 이후 모든 요청: Authorization: Bearer <JWT>
```

### 백엔드 추가 사항

```python
# 신규 엔드포인트
POST /auth/mobile/token   { code, redirect_uri } → { token, user }
GET  /auth/mobile/me      → { uid, name, picture }

# 신규 미들웨어 (기존 require_auth 완전 별개)
def require_mobile_auth(request):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    # JWT 검증 → user_id 반환
```

### 앱 라우팅

```
앱 실행 → expo-secure-store에 JWT 있음?
  ├── 있음 → (tabs) 메인으로
  └── 없음 → (auth)/login 으로
```

---

## 4. 신규 DB 테이블

기존 테이블(`users`, `pins`, `verified_cities` 등)은 그대로 재사용하고, 아래 테이블만 추가한다.

### Feed 탭

```sql
CREATE TABLE posts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    tags        JSONB NOT NULL DEFAULT '[]',
    city        TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE post_likes (
    post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
    id          BIGSERIAL PRIMARY KEY,
    post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Discover 탭

```sql
CREATE TABLE circles (
    id           BIGSERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE circle_members (
    circle_id   BIGINT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (circle_id, user_id)
);
```

### Plans 탭

```sql
CREATE TABLE move_plans (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL,
    from_city   TEXT,
    to_city     TEXT,
    stage       TEXT NOT NULL DEFAULT 'planning',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE move_checklist_items (
    id          BIGSERIAL PRIMARY KEY,
    plan_id     BIGINT NOT NULL REFERENCES move_plans(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    is_done     BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0
);
```

### Profile 탭

```sql
CREATE TABLE user_badges (
    user_id     TEXT NOT NULL REFERENCES users(id),
    badge       TEXT NOT NULL,
    earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge)
);
```

### 전체 관계

```
users
  ├── posts (1:N)
  │     ├── post_likes (1:N)
  │     └── post_comments (1:N)
  ├── pins (1:N)              ← 기존
  ├── move_plans (1:N)
  │     └── move_checklist_items (1:N)
  ├── circle_members (N:M) ── circles
  └── user_badges (1:N)
```

---

## 5. 모바일 API 엔드포인트

모든 엔드포인트는 `require_mobile_auth` 미들웨어(JWT)를 사용한다.  
기존 `/api/*` 엔드포인트는 일체 수정하지 않는다.

### 인증

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /auth/mobile/token | Google OAuth code → JWT 발급 |
| GET | /auth/mobile/me | 현재 유저 정보 |

### Feed

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/mobile/posts | 포스트 목록 (페이지네이션) |
| POST | /api/mobile/posts | 새 포스트 작성 |
| POST | /api/mobile/posts/{id}/like | 좋아요 토글 |
| GET | /api/mobile/posts/{id}/comments | 댓글 목록 |
| POST | /api/mobile/posts/{id}/comments | 댓글 작성 |

### Discover

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/mobile/cities | verified_cities 기반 도시 목록 |
| GET | /api/mobile/cities/{city_id} | 도시 상세 |
| GET | /api/mobile/circles | 서클 목록 |
| POST | /api/mobile/circles/{id}/join | 서클 가입/탈퇴 토글 |
| GET | /api/mobile/pins | 내 저장 도시 |
| POST | /api/mobile/pins | 도시 저장 |

### Plans

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/mobile/moves | 내 이동 계획 목록 |
| POST | /api/mobile/moves | 새 이동 계획 생성 |
| PATCH | /api/mobile/moves/{id} | stage 업데이트 |
| DELETE | /api/mobile/moves/{id} | 이동 계획 삭제 |
| PATCH | /api/mobile/moves/{id}/items/{item_id} | 체크리스트 완료 토글 |

### Profile

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/mobile/profile | 프로필 (users + badges + 통계) |

### Recommend (기존 기능 모바일 지원)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/mobile/recommend | 도시 추천 (JWT 인증) |
| POST | /api/mobile/detail | 도시 상세 가이드 (JWT 인증) |

---

## 6. 모바일 앱 데이터 레이어

### 디렉토리 구조 추가

```
src/
├── api/
│   ├── client.ts        — fetch 래퍼 (baseURL, Bearer 헤더 자동 주입)
│   ├── auth.ts          — /auth/mobile/* 호출
│   ├── posts.ts         — Feed API
│   ├── cities.ts        — Discover API (cities, pins)
│   ├── circles.ts       — Discover API (circles)
│   ├── moves.ts         — Plans API
│   └── profile.ts       — Profile API
├── store/
│   └── auth-store.ts    — JWT + 유저 정보 전역 상태
├── app/
│   ├── (auth)/
│   │   └── login.tsx    — Google 로그인 화면 (신규)
│   └── (tabs)/          — 기존 4개 탭 (mock → API 교체)
```

### client.ts 핵심 로직

```typescript
const API_BASE = 'https://api.nnai.app';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('jwt');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
```

### 탭별 mock → API 전환

| 탭 | 제거할 mock 데이터 | 연결할 API |
|---|---|---|
| Feed | `featuredPosts`, `nomadSnapshot` | `GET /api/mobile/posts` |
| Discover | `cityRadar`, `circles` | `GET /api/mobile/cities`, `GET /api/mobile/circles` |
| Plans | `moveBoard`, `stayPlaybook` | `GET /api/mobile/moves` |
| Profile | `profileSummary` | `GET /api/mobile/profile` |

---

## 7. 개발 순서

1. **백엔드**: DB 마이그레이션 (신규 테이블 생성)
2. **백엔드**: `/auth/mobile/token` + `require_mobile_auth` 미들웨어
3. **앱**: 로그인 화면 + JWT 저장 + 인증 라우팅
4. **백엔드 + 앱**: 탭별 API 구현 및 연결 (Feed → Discover → Plans → Profile 순)
5. **앱**: mock 데이터 제거
6. **배포**: EAS Build → TestFlight / Play 내부 테스트

---

## 8. 보류 항목 (MVP 이후)

- 푸시 알림 (`device_push_tokens` 테이블 신규)
- 이미지 업로드 (포스트 첨부, 프로필 사진 변경)
- 실시간 피드 갱신
- App Store / Play Store 메타데이터, 개인정보처리방침
