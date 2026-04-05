# NNAI Mobile → 본체 백엔드 구현 요청 One-pager

작성일: 2026-04-05  
대상: nnai 본체(백엔드) 구현 담당  
목적: 모바일 앱 현재 코드 기준으로 **필수 구현 API/DB 계약**을 한 장으로 확정

## 1) 구현 범위 (필수)

### Auth (`/auth/mobile/*`)
- `POST /auth/mobile/token` -> `{ token, user }`
- `GET /auth/mobile/me` -> `User`

### Core Mobile (`/api/mobile/*`)
- Feed
  - `GET /posts?limit&offset`
  - `POST /posts`
  - `POST /posts/{post_id}/like`
  - `GET /posts/{post_id}/comments`
  - `POST /posts/{post_id}/comments`
- Discover/City
  - `GET /cities`
  - `GET /cities/{city_id}`
  - `GET /circles`
  - `POST /circles/{id}/join`
  - `GET /pins`
  - `POST /pins`
  - `GET /city-stays`
  - `POST /city-stays`
  - `PATCH /city-stays/{id}`
  - `POST /city-stays/{id}/leave`
- Plans
  - `GET /moves`
  - `POST /moves`
  - `PATCH /moves/{id}`
  - `DELETE /moves/{id}`
  - `PATCH /moves/{id}/items/{item_id}`
- Profile
  - `GET /profile`
- Recommend
  - `POST /recommend`
  - `POST /detail`
- Upload
  - `POST /uploads/image` (multipart form-data, field: `file`) -> `{ url }` 또는 `{ image_url }`

### Type Actions (`/api/mobile/type-actions/*`)
- Planner
  - `GET/POST /planner/boards`
  - `POST /planner/boards/{board_id}/tasks`
  - `PATCH /planner/tasks/{task_id}`
- Free Spirit
  - `POST /free-spirit/spins`
- Wanderer
  - `GET/POST/PATCH/DELETE /wanderer/hops/{hop_id?}`
- Local
  - `GET /local/events/saved`
  - `POST /local/events/save`
  - `PATCH /local/events/{event_id}`
- Pioneer
  - `GET /pioneer/milestones`
  - `PATCH /pioneer/milestones/{milestone_id}`

## 2) 응답 계약 (앱 의존 필드, 누락 금지)

- `GET /api/mobile/profile`:
  - `uid`, `name`, `picture`, `email`
  - `nomad_type` (`free_spirit|local|pioneer|planner|wanderer|null`) **필수**
  - `badges: string[]`
  - `stats: { pins, posts, circles }`

- `GET/POST/PATCH /api/mobile/type-actions/wanderer/hops`:
  - `status`: `planned | booked`만 사용
  - `conditions: [{ id, label, is_done }]` **필수**
  - `is_focus: boolean` **필수**

- `GET/POST/PATCH /api/mobile/city-stays`:
  - `id, city, country, arrived_at, left_at, visa_expires_at, budget_total, budget_remaining, created_at, updated_at`

## 3) DB 변경사항 (필수 마이그레이션)

1. `city_stays` 테이블 신규
2. `wanderer_hops` 수정
   - `conditions JSONB NOT NULL DEFAULT '[]'::jsonb` 추가
   - `is_focus BOOLEAN NOT NULL DEFAULT FALSE` 추가
   - status 제약을 `planned|booked`로 축소

## 4) 현재 문서와의 불일치 (이번 요청에서 같이 정리 필요)

- 일부 통합 문서에 `wanderer_hops`가 구 스키마(`visited|dropped`)로 남아 있음
- 일부 문서에서 `city-stays` API/테이블 정의 누락
- `profile` 예시 응답에 `nomad_type` 누락된 버전 존재
- 업로드 API(`/api/mobile/uploads/image`) 계약이 흩어져 있음

## 5) 백엔드 구현 완료 기준 (DoD)

- 위 엔드포인트가 JWT Bearer 인증으로 정상 동작
- 401/404/422 에러 포맷 일관성 유지 (`detail` 포함)
- 앱이 사용하는 필수 응답 필드 100% 반환
- `city-stays` + `wanderer_hops` 신규 계약 반영 후 모바일 탭(`City`, `Me`, `Feed`, `Compose`)에서 회귀 없음

## 6) 함께 전달할 파일(레퍼런스)

- `src/types/api.ts`
- `src/api/auth.ts`
- `src/api/posts.ts`
- `src/api/cities.ts`
- `src/api/moves.ts`
- `src/api/circles.ts`
- `src/api/profile.ts`
- `src/api/type-actions.ts`
- `docs/superpowers/specs/2026-04-05-city-stays-wanderer-redesign.md`
- `docs/backend-mobile-integration.md`
- `assets/docs/api-reference.md`
- `assets/docs/db-schema.md`
