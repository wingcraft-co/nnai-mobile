# NNAI Mobile Replatform Design — Nomad Ops First

작성일: 2026-04-11
상태: Draft v1 (사용자 합의 반영)

## 1. 문제 재정의

대상은 이동이 잦은 중급 디지털노마드다. 기존 경험의 핵심 실패는 다음 두 가지가 동시에 발생하는 지점이다.

1. 체류 기한 계산 불확실로 인한 오버스테이 리스크
2. 출국-입국-체크인 연결 불확실로 인한 일정 붕괴

이 리스크는 예산/생산성 문제로 확장되지만, MVP에서는 가장 치명적인 체류/이동 운영 실패를 먼저 제거한다.

## 2. 제품 목표 (2주 MVP)

단일 Job-to-be-done:
현재 체류 도시 기준으로 언제 떠나야 하는지와 다음 이동 연결의 안전성을 10분 안에 확정한다.

MVP 성공 기준:

1. 사용자가 현재 도시의 `Must Leave Date`를 즉시 확인할 수 있다.
2. 다음 이동안 1개를 충돌 없이 확정할 수 있다.
3. 임박 상태에서 자동 경고와 우선 액션이 표시된다.

MVP 제외 범위:

1. 가격 최적화 항공 탐색/예약 대행
2. 세법/이민 컨설팅
3. 커뮤니티 중심 기능 확장

## 3. 접근 전략

선택된 접근은 `Timeline-first`다.

1. 체류 기한/버퍼/경고를 먼저 자동 계산
2. 같은 흐름에서 이동 연결(출국-입국-체크인) 슬롯을 검증

선정 이유:

- 오버스테이라는 치명 리스크를 먼저 제거한다.
- 입력 부담이 낮고, 2주 내 안정적 구현이 가능하다.

## 4. IA 전면 개편

기존 탭 구조는 폐기하고 아래 IA로 재구성한다.

1. `Timeline`
- 현재 체류 상태, must leave, 위험 상태, 다음 필수 액션
2. `Connect`
- 출국-입국-체크인 연결 플래너와 충돌 검사
3. `Alerts`
- 임박/충돌/미완료 액션 큐 (우선순위 정렬)
4. `Me`
- 계정/설정/기록 + 페르소나 상태

핵심 UX 원칙:

1. 입력은 3스텝 이내
2. 모든 주요 화면 상단에 `다음 위험 이벤트` 고정
3. 문제 사유를 기계적으로 명시 (`D+2 Overstay Risk`, `Check-in mismatch`)
4. 수정 액션은 1탭 내 완료 가능

## 5. 도메인 모델

핵심 객체:

1. `Stay`
- `city`, `entry_date`, `allowed_days`, `must_leave_date`, `warning_window_days`
2. `MoveDraft`
- `from_city`, `to_city`, `depart_date`, `arrive_date`, `checkin_date`
3. `RiskState`
- `safe | warning | critical | overdue`
4. `ConstraintCheck`
- 오버스테이, 날짜 역전, 버퍼 부족, 체크인 미스매치

검증 규칙:

1. `must_leave_date = entry_date + allowed_days`
2. `depart_date`는 `must_leave_date`를 초과하면 `critical`
3. `arrive_date <= checkin_date`가 아니면 에러
4. 버퍼(기본 0~1일) 미달이면 경고

## 6. 핵심 플로우

1. 초기 입력
- 사용자가 현재 도시 입국일/허용체류일 입력
- 즉시 must leave 계산
2. 이동안 작성
- 다음 도시/출국/도착/체크인 입력
3. 실시간 검증
- 충돌/경고/위험 사유 즉시 노출
4. 확정
- 충돌 없으면 이동안 확정 저장
- 충돌 있으면 수정 제안과 즉시 이동

경계 케이스:

1. 입국일 누락: 계산 차단 + 입력 유도
2. 허용일 비정상(0 이하): 저장 차단
3. 도착일 > 체크인일: 즉시 오류
4. 출국일 > must leave: `critical` 승격 + 긴급 CTA

## 7. Persona 및 픽셀아트 연계

요구사항:
연동 계정의 페르소나와 UI 코칭을 연계하고, 픽셀아트 캐릭터 자산은 유지한다.

설계:

1. 로그인 시 `nomad_type` 전역 로드
2. 정책 계산은 공통, 설명/추천 톤은 페르소나별 차등
- `wanderer`: 이동 템포 중심
- `planner`: 버퍼/체크리스트 엄격 모드
- `free_spirit`: 최소 입력 빠른 확정 모드
3. 상태 시각화는 기존 픽셀아트 캐릭터/이모트 유지
- `safe/warning/critical/overdue` 상태를 픽셀 표현으로 통일

## 8. 데이터/API 정렬 원칙

기존 모바일 계약 축(`city-stays`, `moves`, `profile.nomad_type`)을 유지하고, 화면 IA만 재정렬한다.

1. Timeline은 `city-stays`를 진실 원천으로 사용
2. Connect는 `moves`/`wanderer hops`와 매핑 가능하게 유지
3. Me는 `profile`의 `nomad_type`과 상태 요약 제공

주의:
이번 단계는 구조/흐름 재정의다. 신규 복잡 도메인(예약 대행 등) 추가는 보류한다.

## 9. 측정 지표 (MVP)

필수 이벤트:

1. `timeline_viewed`
2. `must_leave_computed`
3. `move_draft_created`
4. `constraint_error_shown` (error_type 포함)
5. `move_draft_confirmed`
6. `critical_alert_opened`

판단 지표:

1. 첫 must leave 계산 완료율
2. move draft 확정 전환율
3. critical 상태 체류 시간 감소
4. 경고 발생 후 수정 완료율

## 10. 2주 범위 고정

포함:

1. IA 교체 (`Timeline/Connect/Alerts/Me`)
2. must leave 계산과 위험 상태 시스템
3. 이동 연결 검증과 확정 플로우
4. 페르소나별 코칭 문구 분기
5. 픽셀아트 상태 표현 유지

제외:

1. 예약 연동 자동화
2. 고급 추천 엔진
3. 커뮤니티/피드 기능 확장

## 11. 오픈 이슈

1. 국가별 비자 규칙 자동화 범위는 이후 단계에서 확장 (MVP는 사용자 입력 기반)
2. 버퍼 기본값(0일/1일)은 초기 사용자 테스트로 확정
3. Alerts 우선순위 정렬 가중치 세부 정책은 구현 계획에서 고정
