# 스펙: Gamification / Progress

## 1. 목표
- 학습 반복을 유도하고 이탈을 줄이는 보상 구조를 제공한다.
- 단순 체류시간이 아닌 실습 성과 중심으로 보상한다.

## 2. 핵심 개념
- `XP`
- `Level`
- `Streak`
- `Achievement`
- `Milestone`

## 3. XP 설계
## 3.1 계산식
- `baseXp + difficultyBonus - retryPenalty - hintPenalty`
- 하한선: `0`

## 3.2 difficultyBonus
- beginner: +0
- daily: +10
- advanced: +25
- scenario: +40

## 3.3 anti-farming
- 동일 미션 반복 통과 시 XP 감쇠:
  - 1회차 100%
  - 2회차 60%
  - 3회차 이상 20%

## 4. 레벨 시스템
- 누적 XP 기반 비선형 성장식
- 예시:
  - L1: 0
  - L2: 100
  - L3: 240
  - L4: 420
- 레벨업 시 배지/공유 CTA 제공

## 5. 스트릭 규칙
- 일일 1개 이상 미션 pass 시 streak +1
- 24시간 내 미션 pass 없으면 streak 초기화
- 사용자 로컬 타임존 기준

## 6. 업적 설계
## 6.1 업적 예시
- `first_mission_passed`
- `track_a_completed`
- `copy_mode_master`
- `streak_7_days`
- `full_curriculum_completed`

## 6.2 해금 조건
- 조건식 기반 evaluator로 판정
- 중복 해금 방지 idempotent 처리

## 7. Progress 페이지 요구사항
- 오늘 학습 요약
- 트랙별 진행률
- 최근 통과 미션
- XP/레벨/스트릭 카드
- 다음 추천 미션 1~3개

## 8. 마일스톤 정의
- 첫 챕터 완료
- 각 Track 완료 (v1: A~C)
- 스트릭 7일
- 전체 커리큘럼 완료

## 9. 공유 연계
- 마일스톤 해금 시 공유 모달 노출
- `/share/:milestoneSlug`로 연결
- payload에 level/xp/date 포함

## 10. 저장 모델
- `progress` store에 XP/level/streak 저장
- `achievements` store에 해금 이력 저장
- 계산 결과는 derived selector로 표시

## 11. UX 가이드
- 피드백은 즉시 제공 (pass 직후 XP 애니메이션)
- 과한 모션 금지(학습 집중 방해 방지)
- 실패 시 패널티만 강조하지 않고 "다음 액션" 제공

## 12. 분석(라우트 기반)
- 마일스톤 측정 라우트:
  - `/share/track-a-complete`
  - `/share/track-b-complete`
  - `/share/track-c-complete`
  - `/share/final-complete`
- 진행 확인 라우트:
  - `/progress`

## 13. 테스트
- XP 계산 경계값 테스트
- anti-farming 감쇠 테스트
- 스트릭 날짜 경계(자정) 테스트
- 업적 중복 해금 방지 테스트

## 14. DoD
- XP/레벨/스트릭/업적이 실제 학습 플로우와 일관되게 동작
- 마일스톤 해금과 공유 플로우 연동 완료
- 반복 학습 유도 지표(재방문/복습 진입) 개선 관측 가능
