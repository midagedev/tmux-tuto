# A3 마일스톤 조건 재정의안 (Progress/Share 정합)

- 기준 파일: `src/pages/Progress/ProgressPage.tsx`, `src/content/v1/share-meta.json`, `src/features/sharing/*`
- 작성일: 2026-02-18
- 목표: 마일스톤 문구와 실제 해금 조건 불일치 0건

## 1) 핵심 원칙

- 문구는 반드시 조건식을 그대로 설명해야 한다.
- Progress 링크 노출 조건과 Share 메타(slug/title/description)는 동일 slug 계약을 사용한다.
- `first-chapter-complete`는 "첫 챕터 전체 완료"를 의미하며, 단일 미션 완료와 구분한다.

## 2) 마일스톤 조건 정의표

| milestoneSlug | 조건식(정의) | Progress 노출 기준 | Share 카드 문구 기준 |
| --- | --- | --- | --- |
| `first-chapter-complete` | `chapter(tmux-onramp)`에 속한 모든 missionSlug가 완료됨 | 첫 챕터 완료 시 노출 | "첫 챕터 실습 완료" |
| `track-a-complete` | Track A 전체 missionSlug 완료 | Track A 100% 시 노출 | "Track A 완료" |
| `track-b-complete` | Track B 전체 missionSlug 완료 | Track B 100% 시 노출 | "Track B 완료" |
| `track-c-complete` | Track C 전체 missionSlug 완료 | Track C 100% 시 노출 | "Track C 완료" |
| `streak-7` | `streakDays >= 7` | streak 7일 달성 시 노출 | "7일 스트릭 달성" |
| `final-complete` | `track-a-complete && track-b-complete && track-c-complete` | 전체 트랙 100% 시 노출 | "전체 커리큘럼 완료" |

## 3) 문구-조건 매핑표

| 마일스톤 | 기존 문구 리스크 | v1 문구/설명 가이드 |
| --- | --- | --- |
| first-chapter-complete | "첫 챕터"가 1미션 완료로 오해될 수 있음 | "Onramp 챕터의 모든 미션을 완료"로 조건을 명시 |
| track-a/b/c-complete | 구현은 비율, 문구는 완주로 표기될 수 있음 | "해당 트랙 실습 전체 완료"로 고정 |
| streak-7 | 시간대 경계 오해 가능 | "로컬 날짜 기준 7일 연속"을 설명에 포함 |
| final-complete | 일부 트랙 완료 상태에서도 오해 가능 | "Track A~C 전체 완료"를 명시 |

## 4) Progress/Share 노출 규칙

- Progress 페이지
- 노출: 조건식 만족 마일스톤만 CTA 노출
- 비노출: 미달성 마일스톤은 CTA를 숨기고 조건 힌트 텍스트만 노출 가능

- Share 페이지
- URL slug는 `milestoneSlug`와 1:1 매핑
- badge는 `share-meta.json`의 `badge` 값을 사용
- payload에는 `level/xp/date/badge`만 포함하고 조건 계산은 Progress에서 완료

## 5) 구현 체크리스트 (이슈 #11 입력)

- `first-chapter-complete` 계산식을 `completedMissionSlugs.length >= 1`에서 챕터 완주 기반으로 교체
- 조건 계산 유틸을 Progress에서 분리(중복 방지)
- `share-meta.json` 문구가 조건식 설명과 충돌 없는지 동기화
- 공유 링크 생성/파싱 회귀 테스트 유지

## 6) 완료 기준 점검

- 마일스톤 조건 정의표: 작성 완료
- 문구-조건 매핑표: 작성 완료
- 불일치 0건 목표를 구현 이슈 입력으로 전달 가능: 충족
