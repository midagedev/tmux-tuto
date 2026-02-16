# KPI 라우트 맵 (Cloudflare Web Analytics)

## 1. 온보딩 퍼널
| 단계 | 라우트 | KPI |
|---|---|---|
| 시작 | `/onboarding/start` | 온보딩 진입 수 |
| 목표 선택 | `/onboarding/goal` | 시작 대비 2단계 전환율 |
| 선호 설정 | `/onboarding/preferences` | 2단계 대비 3단계 전환율 |
| 첫 미션 | `/onboarding/first-mission` | 첫 실습 진입률 |
| 첫 통과 | `/onboarding/first-mission/passed` | 첫 실습 성공률 |
| 완료 | `/onboarding/done` | 온보딩 완료율 |

## 2. 플레이북 사용
| 이벤트 | 라우트 | KPI |
|---|---|---|
| 플레이북 진입 | `/playbooks/:playbookSlug` | 실무 가이드 사용률 |
| 명령 복사 | `/playbooks/:playbookSlug/copied` | 명령 복사 실행률 |

## 3. 공유/마일스톤
| 마일스톤 | 라우트 | KPI |
|---|---|---|
| 첫 챕터 완료 | `/share/first-chapter-complete` | 첫 성취 공유 진입 |
| Track A 완료 | `/share/track-a-complete` | Track A 도달률 |
| Track B 완료 | `/share/track-b-complete` | Track B 도달률 |
| Track C 완료 | `/share/track-c-complete` | Track C 도달률 |
| 7일 스트릭 | `/share/streak-7` | 반복 학습 유지율 |
| 전체 완료 | `/share/final-complete` | 전체 완주율 |

## 4. 검증 체크
- `npm run verify:kpi-routes` 실행 시:
  - 핵심 라우트 문자열이 `src/app/router.tsx`에 존재하는지 확인
  - `public/share/*/index.html` 정적 메타 페이지 존재 확인
  - `src/content/v1/share-meta.json` milestone 정합성 확인
