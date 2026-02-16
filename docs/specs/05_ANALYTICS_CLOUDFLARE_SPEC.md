# 스펙: Cloudflare Web Analytics 기반 측정

## 1. 목표
- 백엔드 없이 제품 사용량과 핵심 KPI를 파악한다.
- Cloudflare Web Analytics를 단일 기본 측정 도구로 사용한다.

## 2. 원칙
1. 커스텀 이벤트 SDK 도입 없이 라우트 기반으로 측정한다.
2. 학습 이벤트는 전용 라우트 진입으로 치환한다.
3. 개인정보 수집은 최소화한다.

## 3. 측정 대상
- 페이지뷰
- 세션
- 리퍼러
- 국가/디바이스 분포
- 주요 라우트 유입량

## 4. 라우트 택소노미
## 4.1 기능 라우트
- `/learn`
- `/learn/:trackSlug/:chapterSlug/:lessonSlug`
- `/practice`
- `/cheatsheet`
- `/bookmarks`
- `/progress`
- `/playbooks`
- `/playbooks/:playbookSlug`
- `/onboarding/start`
- `/onboarding/goal`
- `/onboarding/preferences`
- `/onboarding/first-mission`
- `/onboarding/done`

## 4.2 이벤트 치환 라우트
- 미션 통과: `/progress/missions/:missionSlug/passed`
- Track 완료: `/share/track-a-complete`, `/share/track-b-complete`, `/share/track-c-complete`
- 전체 완료: `/share/final-complete`
- 플레이북 명령 복사: `/playbooks/:playbookSlug/copied`
- 온보딩 첫 미션 통과: `/onboarding/first-mission/passed`

## 5. SPA 계측 방식
- 라우터 전환 시 명시적으로 pageview가 집계되도록 설정한다.
- history API 기반 라우팅에서 측정 누락 여부를 E2E로 검증한다.

## 6. KPI 정의
- 코스 시작률:
  - 분자: `/learn/*` 방문 세션
  - 분모: 전체 세션
- 미션 성공 트래픽:
  - `/progress/missions/*/passed` 페이지뷰 수
- 마일스톤 도달률:
  - `/share/track-*-complete` 페이지뷰 / 코스 시작 세션
- 전체 완주율:
  - `/share/final-complete` 페이지뷰 / 코스 시작 세션
- 공유 확산:
  - 공유 페이지 리퍼러 중 `x.com|twitter.com` 비율
- 실무 가이드 사용률:
  - `/playbooks/*` 페이지뷰 / `/learn/*` 세션
- 온보딩 완료율:
  - `/onboarding/done` 페이지뷰 / `/onboarding/start` 페이지뷰

## 7. 분석 동의 정책
- 첫 방문 시 동의 배너 제공
- 동의 전:
  - 분석 스크립트 비활성
  - 동의 시점 이후부터 측정 시작
- 동의 상태는 `localStorage.analytics_consent`로 저장

## 8. 리포팅 루틴
- 주간 리포트 항목:
  - 총 방문/세션
  - 코스 시작률
  - Track 완료율
  - 전체 완주율
  - 공유 유입 리퍼러 Top 5

## 9. 한계
- 사용자 단위 퍼널 정밀 분석 불가
- 정확한 재방문 식별이 제한됨
- 오프라인 활동은 즉시 측정되지 않음

## 10. 보완 전략
- 핵심 이벤트를 반드시 라우트로 노출해 측정 누락 최소화
- KPI 해석 시 라우트 기반 근사치임을 명시

## 11. 테스트
- 라우트 이동 시 pageview 증가 확인
- 공유 페이지 유입 리퍼러 수집 확인
- 동의/비동의 전환 시 측정 on/off 확인

## 12. DoD
- Cloudflare 대시보드에서 정의 KPI 관측 가능
- SPA 라우트 측정 누락 없음
- 프라이버시 정책과 구현 동작 일치
