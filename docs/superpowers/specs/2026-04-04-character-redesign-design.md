# NNAI Nomad Mobile — Character-Centric Redesign

**Date:** 2026-04-04
**Status:** Approved
**Target:** Production-ready mobile app

## Overview

기존 NNAI Nomad Mobile 앱을 5가지 노마드 캐릭터 타입 중심으로 리디자인한다. 기존 기능(피드, 도시 디스커버, 이동 계획, 프로필)은 유지하되, 캐릭터 시스템을 핵심 UX로 녹여내고 전면 픽셀/레트로 비주얼로 전환한다. 상품화 가능한 수준의 완성도를 목표로 한다.

## Characters

### 5 Nomad Types (user-assigned)

| ID | Name | Description | Color Accent | Asset Directory |
|---|---|---|---|---|
| `free_spirit` | Free Spirit | 자유로운 영혼 | `#b07cc6` (purple) | `resources/character/free_spirit/` |
| `local` | Local | 현지 탐험가 | `#4eba8a` (teal) | `resources/character/local/` |
| `pioneer` | Pioneer | 개척자 | `#d4a020` (gold) | `resources/character/pioneer/` |
| `planner` | Planner | 계획형 여행자 | `#4a7ab5` (blue) | `resources/character/planner/` |
| `wanderer` | Wanderer | 방랑자 | `#c75a3a` (red-orange) | `resources/character/wanderer/` |

각 타입은 고유 accent color를 가지며, 해당 유저의 UI 포인트 컬러로 사용된다 (프로필, 플립카드 보더, 말풍선 등).

### Earth (app-level)

- **Role:** 앱 로고 + 로딩 애니메이션
- **Assets:** `resources/character/earth/` (png + gif, 64px + web variants)
- **Usage:** 스플래시/로딩 화면에서 `earth.gif` 사용, 앱 헤더에 `earth_64.png` 로고

### Asset Variants

각 캐릭터 디렉토리:
- `{name}.png` — 원본 해상도 (약 512px), 프로필 표시용
- `{name}.gif` — 애니메이션 버전, 플로팅 동반자용
- `{name}_64.png` — 64px 아이콘용, 피드 카드/리스트 아이템
- `{name}_64.gif` — 64px 애니메이션 아이콘용

## Type Assignment & Onboarding

- 노마드 타입은 nnai.app 웹 플랫폼에서 사전 결정됨
- 로그인 시 API(`/api/mobile/me`)에서 유저의 `nomad_type` 필드를 받아옴
- `nomad_type`이 null인 경우:
  1. 전용 안내 화면 표시: "아직 노마드 타입이 정해지지 않았어요"
  2. Earth 캐릭터가 말풍선으로 안내: "nnai.app에서 나만의 타입을 찾아보세요!"
  3. CTA 버튼 → `Linking.openURL('https://nnai.app/type-quiz')` 로 외부 브라우저 오픈
  4. 앱 복귀 시 자동 re-fetch (`/api/mobile/me`)
- 타입 할당 완료 후 첫 진입 시 환영 애니메이션: 캐릭터 등장 + "당신은 {타입}이군요!" 말풍선

## Navigation — 3-Tab Structure

```
[ 피드 ]  [ 도시 ]  [ 나 ]
```

탭바 스타일:
- 배경: card color, 상단 1px border
- 활성 탭: primary(amber) 컬러 + bold
- 비활성 탭: muted-foreground
- 아이콘: 픽셀 스타일 커스텀 아이콘 또는 모노 텍스트 아이콘

### Tab 1: 피드 (메인, `index.tsx`)

**레이아웃:**
- 상단 헤더: Earth 로고(earth_64.png) + "nnai" 텍스트
- 2x2 플립카드 그리드 (기존 UX 유지)
- 하단: 글쓰기 FAB 버튼

**플립카드 리디자인:**
- 앞면:
  - 작성자 캐릭터 아이콘 (64px, `image-rendering: pixelated`)
  - 포스트 제목
  - 타입 라벨 (타입별 accent color 배지)
  - 도시명
- 뒷면:
  - 본문 텍스트 (최대 3줄, 말줄임)
  - 태그 (모노 스타일, `#tag`)
  - 좋아요 수 + 댓글 수
  - 작성 시간 (상대 시간)
- 카드 보더: 작성자 타입의 accent color로 미세하게 적용 (1px left border 또는 top border)
- 플립 애니메이션: 기존 Reanimated 기반 유지

**개인화:**
- 기본 정렬: 사용자 타입과 동일한 타입의 포스트 우선 (API 쿼리 파라미터 `?prefer_type={type}`)
- 폴백: API가 개인화를 지원하지 않으면 클라이언트에서 정렬

**Pull-to-refresh, 좋아요 낙관적 업데이트 기존 로직 유지.**

### Tab 2: 도시 (`city.tsx`)

기존 디스커버 탭 + 서클을 통합 재구성:

**섹션 1 — 검색:**
- 모노스페이스 입력 필드, `> 도시 검색...` 플레이스홀더
- 클라이언트 필터링 (도시명 한/영)

**섹션 2 — 타입별 추천 도시 (가로 스크롤):**
- 헤더: "* {타입명}에게 맞는 도시"
- 가로 FlatList, 각 카드에 도시명 + 월 비용 + "추천" 배지
- primary color 보더로 강조
- 추천 로직: API에서 타입별 추천 지원 시 사용, 아니면 클라이언트에서 nomad_score 기반 정렬

**섹션 3 — 모든 도시 (세로 리스트):**
- 기존 도시 데이터: 도시명, 국가, 월 비용, 인터넷 속도, 종합 점수
- 정렬: nomad_score 내림차순

**섹션 4 — 내 서클:**
- 가입한 서클 가로 스크롤 카드 (이름 + 멤버 수)
- 탭하면 서클 상세 (미래 확장)
- 가입/탈퇴 토글 기존 로직 유지

**SectionList 사용으로 하나의 스크롤 뷰에 모든 섹션 통합. Pull-to-refresh.**

### Tab 3: 나 (`me.tsx`)

기존 프로필 + 계획을 통합:

**섹션 1 — 캐릭터 프로필:**
- 캐릭터 이미지 (원본 png, 약 120px 표시, `image-rendering: pixelated`)
- 타입명 (대문자, primary color, letter-spacing)
- 유저 이름
- 이메일 (muted color)

**섹션 2 — 스탯 (3열 그리드):**
- 도시 수 / 포스트 수 / 서클 수
- 숫자: primary color, bold
- 라벨: muted-foreground

**섹션 3 — 이동 계획:**
- 기존 MovePlan 카드: from_city → to_city
- 단계 뱃지: 계획중 / 예약완료 / 완료 (각각 스타일 분기)
- 체크리스트 진행률: `[###--] 3/5` 스타일 텍스트 프로그레스
- 체크리스트 토글 기존 로직 유지

**섹션 4 — 뱃지:**
- 가로 배열, 정사각 카드 (36px)
- 획득한 뱃지: primary border, 미획득: muted border + "?" 아이콘

**로그아웃 버튼:** 하단, destructive color

**ScrollView 또는 SectionList. Pull-to-refresh.**

## Floating Companion

앱 전역에 표시되는 캐릭터 동반자:

**표시:**
- 위치: 화면 우측 하단 (right: 16, bottom: tabBarHeight + 16)
- 사이즈: 48px (64px gif를 `Image`로 축소)
- 배경: 원형 card color 컨테이너 + 1px border
- 탭 전환 시 캐릭터 bounce 애니메이션 (Reanimated `withSpring`)

**말풍선:**
- 캐릭터 좌상단에 표시
- 배경: card color, 1px border, 꼬리(tail) CSS
- 텍스트: 10px, muted-foreground
- 자동 표시: 탭 전환 시 2초간 표시 후 fade out
- 탭 인터랙션: 캐릭터 터치 시 랜덤 말풍선 표시

**메시지 컨텍스트:**

| 상황 | 메시지 예시 |
|---|---|
| 피드 진입 | "새 포스트가 있어!", "오늘 뭘 써볼까?" |
| 피드 빈 상태 | "아직 포스트가 없어~", "첫 글을 써봐!" |
| 도시 진입 | "새 도시를 탐험해봐!", "여긴 어때?" |
| 나 진입 | "오늘도 열심히!", "다음 도시는 어디?" |
| 포스트 작성 완료 | "좋은 글이야!" |
| 좋아요 누름 | "나도 좋아!" |

**구현:**
- `FloatingCompanion` 컴포넌트: 탭 레이아웃(`_layout.tsx`)에 배치
- 현재 탭 route를 감지하여 메시지 컨텍스트 결정
- Reanimated로 등장/퇴장 애니메이션

## Loading Screen

- `LoadingScreen` 컴포넌트: Earth gif 중앙 + "loading..." 텍스트
- 사용처:
  - 앱 초기 로딩 (auth hydration 중)
  - 기존 스플래시 대체
- Earth gif는 `expo-image`로 렌더링 (`contentFit: 'contain'`, 120px)

## Visual Style

### Theme: Amber Mono Light (기존 global.css 활용)

| Token | Light Value | 용도 |
|---|---|---|
| `--background` | oklch(0.985 0 0) ≈ #f8f8f8 | 화면 배경 |
| `--card` | oklch(0.97 0 0) ≈ #f2f2f2 | 카드, 입력필드 배경 |
| `--foreground` | oklch(0.205 0 0) ≈ #333333 | 주요 텍스트 |
| `--muted-foreground` | oklch(0.216 0.006 56) ≈ #555555 | 보조 텍스트 |
| `--primary` | oklch(0.666 0.179 58) ≈ #c47a1a | 액센트, 강조, 활성 탭 |
| `--border` | oklch(0.869 0.005 56) ≈ #d5cfc5 | 카드 보더, 구분선 |
| `--destructive` | oklch(0.577 0.245 27) ≈ #c53030 | 에러, 로그아웃 |

- **Font:** Geist Mono (전체 monospace)
- **Radius:** 0rem — 모든 모서리 직각
- **Shadow:** 없음 (opacity 0)
- **다크 모드:** 기존 `.dark` CSS 변수 유지, 시스템 설정 자동 따름

### Constants Update

`src/constants/theme.ts`의 `Colors` 객체를 Amber Mono 값으로 업데이트:

```typescript
export const Colors = {
  light: {
    text: '#333333',
    background: '#f8f8f8',
    backgroundElement: '#f2f2f2',
    backgroundSelected: '#e8e5e0',
    textSecondary: '#555555',
    accent: '#c47a1a',
    destructive: '#c53030',
    border: '#d5cfc5',
  },
  dark: {
    text: '#f3f3f3',
    background: '#1a1a1a',
    backgroundElement: '#2a2a2a',
    backgroundSelected: '#3a3a3a',
    textSecondary: '#999999',
    accent: '#d4952a',
    destructive: '#e05050',
    border: '#4a4540',
  },
} as const;
```

### Pixel Art Rendering

- 모든 캐릭터 이미지에 `style={{ imageRendering: 'pixelated' }}` 또는 React Native에서 `resizeMode: 'nearest'` 적용 (expo-image의 `contentFit`)
- NativeWind 유틸리티: `[image-rendering:pixelated]` 클래스 추가 고려

### Nomad Type Config

```typescript
// src/constants/nomad-types.ts
export const NomadTypes = {
  free_spirit: {
    label: 'Free Spirit',
    labelKr: '자유로운 영혼',
    color: '#b07cc6',
    icon: require('../../resources/character/free_spirit/free_spirit_64.png'),
    iconGif: require('../../resources/character/free_spirit/free_spirit_64.gif'),
    avatar: require('../../resources/character/free_spirit/free_spirit.png'),
    avatarGif: require('../../resources/character/free_spirit/free_spirit.gif'),
  },
  local: {
    label: 'Local',
    labelKr: '현지 탐험가',
    color: '#4eba8a',
    icon: require('../../resources/character/local/local_64.png'),
    iconGif: require('../../resources/character/local/local_64.gif'),
    avatar: require('../../resources/character/local/local.png'),
    avatarGif: require('../../resources/character/local/local.gif'),
  },
  pioneer: {
    label: 'Pioneer',
    labelKr: '개척자',
    color: '#d4a020',
    icon: require('../../resources/character/pioneer/pioneer_64.png'),
    iconGif: require('../../resources/character/pioneer/pioneer_64.gif'),
    avatar: require('../../resources/character/pioneer/pioneer.png'),
    avatarGif: require('../../resources/character/pioneer/pioneer.gif'),
  },
  planner: {
    label: 'Planner',
    labelKr: '계획형 여행자',
    color: '#4a7ab5',
    icon: require('../../resources/character/planner/planner_64.png'),
    iconGif: require('../../resources/character/planner/planner_64.gif'),
    avatar: require('../../resources/character/planner/planner.png'),
    avatarGif: require('../../resources/character/planner/planner.gif'),
  },
  wanderer: {
    label: 'Wanderer',
    labelKr: '방랑자',
    color: '#c75a3a',
    icon: require('../../resources/character/wanderer/wanderer_64.png'),
    iconGif: require('../../resources/character/wanderer/wanderer_64.gif'),
    avatar: require('../../resources/character/wanderer/wanderer.png'),
    avatarGif: require('../../resources/character/wanderer/wanderer.gif'),
  },
} as const;

export type NomadType = keyof typeof NomadTypes;
```

## Data Model Changes

### User Type

```typescript
interface User {
  uid: string;
  name: string;
  picture: string;
  email: string;
  nomad_type: NomadType | null;
}
```

### Post Type

```typescript
interface Post {
  id: string;
  user_id: string;
  author: string;
  picture: string;
  title: string;
  body: string;
  tags: string[];
  city: string;
  likes_count: number;
  created_at: string;
  liked: boolean;
  author_nomad_type: NomadType;
}
```

### Auth Store

```typescript
// auth-store.ts — nomad_type을 user 객체에 포함
// 타입 미지정 감지 로직 추가
const needsTypeAssignment = user && user.nomad_type === null;
```

## Error States & Edge Cases

| 상황 | 처리 |
|---|---|
| nomad_type null | 타입 지정 안내 화면 → nnai.app 유도 |
| API 오류 | 기존 에러 핸들링 유지 + 동반자 말풍선 "앗, 문제가 생겼어..." |
| 이미지 로드 실패 | 캐릭터 아이콘 → 타입 이니셜 fallback (예: "P" for Planner) |
| 빈 피드 | Earth 캐릭터 + "아직 포스트가 없어요" 안내 |
| 빈 도시 | "도시 정보를 불러오는 중..." 로딩 |
| 빈 이동계획 | "아직 계획이 없어요. 새 도시로 떠나볼까?" |
| 네트워크 없음 | 기존 mock 데이터 폴백 (DEV_MOCK_API) |

## Accessibility

- 모든 캐릭터 이미지에 `accessibilityLabel` 적용 (예: "Planner 타입 캐릭터")
- 말풍선 텍스트에 `accessibilityLiveRegion: 'polite'` — 스크린리더 안내
- 탭바 아이콘에 `accessibilityRole: 'tab'` + `accessibilityState: { selected }`
- 플립카드에 `accessibilityHint: "탭하면 뒤집어집니다"`
- 최소 터치 타겟: 44x44pt (iOS HIG)
- 색상 대비: WCAG AA 기준 충족 (primary on background: 4.5:1 이상)

## Performance

- 캐릭터 이미지: `expo-image`로 캐싱 + 메모리 관리 (`cachePolicy: 'memory-disk'`)
- 64px 아이콘은 작은 파일이므로 번들에 포함 (require)
- 원본 png(512px)는 프로필에서만 사용, lazy load
- gif 애니메이션: 플로팅 동반자에서만 재생, 백그라운드 탭에서는 정지 (메모리 절약)
- FlatList 가상화: 도시 리스트, 피드 그리드 모두 FlatList 사용
- 말풍선 타이머: useEffect cleanup으로 메모리 누수 방지

## File Changes Summary

### New Files
- `src/constants/nomad-types.ts` — 타입 정의, 색상, 에셋 매핑
- `src/constants/companion-messages.ts` — 말풍선 메시지 정의
- `src/components/floating-companion.tsx` — 플로팅 캐릭터 + 말풍선
- `src/components/character-avatar.tsx` — 캐릭터 이미지 (pixelated, fallback)
- `src/components/speech-bubble.tsx` — 말풍선 UI
- `src/components/loading-screen.tsx` — Earth 로딩 화면
- `src/components/type-gate.tsx` — 타입 미지정 유저 안내 화면
- `src/app/(tabs)/city.tsx` — 도시 탭 (디스커버+서클 통합)
- `src/app/(tabs)/me.tsx` — 나 탭 (프로필+계획 통합)

### Modified Files
- `src/app/(tabs)/_layout.tsx` — 4탭 → 3탭, FloatingCompanion 배치
- `src/app/(tabs)/index.tsx` — 플립카드 레트로 리스킨 + 캐릭터 아이콘
- `src/app/_layout.tsx` — Earth 로딩, TypeGate 적용
- `src/types/api.ts` — User에 nomad_type, Post에 author_nomad_type
- `src/constants/theme.ts` — Amber Mono 값 업데이트
- `src/store/auth-store.ts` — nomad_type 관리
- `src/data/dev-mock.ts` — 목 데이터에 nomad_type 추가
- `src/i18n/index.ts` — 캐릭터 관련 번역 추가

### Deleted Files
- `src/app/(tabs)/discover.tsx` — city.tsx로 대체
- `src/app/(tabs)/plans.tsx` — me.tsx로 통합
- `src/app/(tabs)/profile.tsx` — me.tsx로 대체

### Unchanged
- `src/app/compose.tsx` — 기존 글쓰기 모달 유지
- `src/app/(auth)/` — 인증 플로우 유지
- `src/api/` — API 함수 구조 유지 (타입만 확장)
- `src/global.css` — 이미 Amber Mono 테마 설정됨

## Out of Scope

- 타입 퀴즈/선택 UI (nnai.app 웹 담당)
- 댓글 기능
- 실시간 업데이트 (WebSocket)
- 팔로우/팔로잉
- 오프라인 동기화
- 푸시 알림
- 지도 뷰
- 프로필 편집
- 포스트 수정/삭제
