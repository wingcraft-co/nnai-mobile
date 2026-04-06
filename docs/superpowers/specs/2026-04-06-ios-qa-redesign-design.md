# iOS QA 기반 전면 개편 디자인 스펙 (B2B / Option 3)

## 1. 목적
- QA 리포트(2026-04-06)에서 확인된 치명/고위 이슈를 해결한다.
- iOS에서 익숙한 실용형 UI(B: Airbnb/Notion 계열 정보밀도)로 화면 구조를 전면 개편한다.
- 캐릭터 정체성은 유지하되 게임 용어는 최소화한다.

## 2. 범위
- 포함: `Turn`, `City`, `Character` 탭 UI/UX 전면 개편, 탭바 개편, QA 핵심 버그/카피/플로우 개선
- 제외: 온보딩 신규 제작, 오프라인 캐시 구조 변경, 백엔드 API 스키마 변경

## 3. 입력 근거 (QA 이슈 매핑)
### Critical
- BUG-01: Situation Card에 raw DB ID 노출
- BUG-02: 빈 Situation Card 노출

### High
- UX01: SIM MODE 상시 노출
- UX02: Growth Checkpoints 의미 불명확
- UX03: VISA 필드가 비어있고 입력 경로 불명확
- UX04: 모호한 버튼/카피 (`What a journey!`)
- Design: 플로팅 캐릭터가 컨텐츠를 가림

### Medium
- UX05: Leave City 확인 다이얼로그 필요
- UX06: 탭 아이콘 비직관적(T/C/R)
- Copy-01: 영어 복수형 오류 (`1 days`)
- UX07: ENERGY vs XP 의미 불명확

## 4. 설계 방향
### 4.1 제품 톤
- 실용형 정보 UI를 기본으로 한다.
- 캐릭터는 유지하되 "게임 UI 장식"보다 "상태 요약 보조 요소"로 역할 축소.
- 용어는 태스크 중심으로 정리한다.

### 4.2 디자인 시스템 리프레시 (Option 3 핵심)
- 색상 토큰 재정의: 배경/표면/경계/강조/위험 색의 대비를 iOS 가독성 기준으로 재정렬
- 간격 토큰 정리: 카드 내부/카드 간 간격 단일 체계화
- 라운드 토큰 정리: 카드/버튼/칩 radius 일관화
- 타이포 스케일 정리: 페이지 타이틀, 섹션 타이틀, 본문, 캡션 4단계로 통일
- 공통 카드 패턴 통일: `Header + KPI Row + Action/Content` 패턴

## 5. 정보 구조 및 화면 설계
### 5.1 Turn 탭
- 상단: Today summary 카드
  - 지표를 `Energy / Progress / Completed`로 단순화
  - ENERGY/XP의 의미를 보조 카피로 명시
- 중단: 퀘스트 리스트
  - 완료 상태 아이콘 + 진행률 유지
- 하단: Situation 카드 그리드
  - 이미지 없는 경우 "빈 카드" 대신 placeholder 카드(아이콘/설명/CTA) 표시
  - 카드 하단 raw ID 표시는 완전 제거
  - 작성자 정보가 필요하면 익명화된 표시명 또는 persona 정보만 노출

### 5.2 City 탭
- `Migration Readiness`와 `Current City`를 별도 카드로 분리
- VISA가 비어있을 경우:
  - 단순 `—` 대신 "VISA not set" 상태 텍스트
  - 바로 이동 가능한 `Edit city details` CTA 제공
- `Leave City`:
  - destructive 스타일 유지
  - 반드시 확인 모달(확인/취소) 경유 후 실행
- 도시 편집 플로우:
  - 진입 경로를 시각적으로 명시 (`Edit`)
  - 저장 후 즉시 반영되도록 피드백 제공

### 5.3 Character 탭
- 상단 캐릭터 히어로는 유지
- `Growth Checkpoints`:
  - "어떻게 0/3을 채우는지"를 문장으로 명시
  - 체크포인트 조건 3개를 텍스트 목록으로 고정 노출
- 모호한 카피 제거:
  - `What a journey!` 계열 문구를 기능형 CTA로 치환
  - 예: `View trip summary`, `Plan next destination`
- checklist/액션 영역:
  - Empty state일 때 안내 문구 + 다음 행동 CTA 제공

### 5.4 하단 탭바
- 기존 T/C/R 문자 아이콘 제거
- iOS에서 익숙한 의미 아이콘 + 라벨 조합 도입
  - Turn: 체크/오늘 할 일 계열
  - City: 위치/지도 계열
  - Character: 프로필/아바타 계열

### 5.5 플로팅 캐릭터 처리
- 콘텐츠를 가리지 않도록 기본 위치/노출 규칙 변경
- 탭별로 중복되는 캐릭터 요소가 있으면 단일 표현만 유지
- 상호작용 가능한 요소라면 시각적 affordance(버튼/히트영역) 명시

## 6. 데이터/상태 처리 원칙
- API 스키마는 유지한다.
- UI 레벨에서 가공/표시 규칙만 강화한다.
  - raw ID 비노출
  - null/empty field의 명시적 상태 처리
  - placeholder 상태의 일관된 렌더링
- destructive action은 로컬 상태 반영 전 사용자 확인을 거친다.

## 7. 오류/예외 처리
- 데이터 누락:
  - 빈 카드 대신 구조화된 fallback 카드 렌더
- 네트워크 실패:
  - 섹션 단위 오류 문구 + 재시도 동선 유지
- 폼 미입력:
  - VISA/예산/날짜 필드에 즉시성 있는 안내 문구 제공

## 8. 카피 정책
- 불명확 표현 제거, 기능 중심 레이블 사용
- 수량 문법(단/복수) 적용:
  - `1 day`, `2 days`
- 한/영 병기 구조는 유지하되 의미 대응 일관성 확보

## 9. 검증 기준 (QA 역추적)
- Turn 카드에서 raw DB ID가 보이지 않는다.
- 이미지 누락 카드가 "빈 상태"로 명확히 렌더되고 동작한다.
- SIM MODE 라벨은 일반 사용자 화면에서 노출되지 않는다.
- City 탭에서 VISA 미설정 시 설정 경로가 즉시 보인다.
- Leave City는 확인 모달 없이는 실행되지 않는다.
- Character 탭에서 Growth Checkpoints 달성 조건을 명확히 이해할 수 있다.
- 하단 탭이 문자 아이콘(T/C/R) 없이 직관적 아이콘으로 동작한다.
- 주요 카피에서 단/복수 오류가 없다.

## 10. 테스트 전략
- 스냅샷/단위:
  - 카드 fallback 렌더링
  - copy formatter(단/복수)
- 상호작용:
  - Leave City 확인 모달 플로우
  - VISA 미설정 -> Edit 진입
- 회귀:
  - Turn/City/Character 주요 API fetch/patch 동선 정상 여부

## 11. 구현 우선순위
1. 치명 버그(Critical) 및 사용자 신뢰 이슈 차단
2. 하이 이슈(학습 불가/플로우 막힘) 해소
3. 디자인 토큰 리프레시와 3개 탭 일관화
4. 카피/아이콘 등 중간 이슈 정리

## 12. 비기능 요구
- iOS 시뮬레이터 기준 터치 타겟/가독성 확보
- 다크 모드 기존 호환성 저해 없이 동작
- 기존 API 호출 성능 특성 유지
