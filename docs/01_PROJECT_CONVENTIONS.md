# 프로젝트 공통 규약 (Source of Truth)

## 1. 목적
- 문서 간 충돌을 줄이고 구현 시 의사결정 기준을 단일화한다.

## 2. 릴리즈 범위 고정 (v1)
- 포함:
  - Track A~C 학습/미션
  - tmux 시뮬레이터 핵심 동작
  - Cheatsheet/Bookmark/Progress
  - 실무 플레이북 3종 (`tmux.conf`, `세션 유지`, `Tailscale SSH`)
  - 공유 페이지 + OG/Twitter 카드
  - Cloudflare Web Analytics 라우트 기반 측정
- 제외:
  - 서버/API/계정 동기화
  - Track D/E 본 학습 콘텐츠 (랜딩에서 "예고"는 가능)

## 3. 네이밍 규약
## 3.1 식별자
- `id`: 내부 저장 키(불변)
- `slug`: URL 경로용 식별자(가독성)
- 라우트 파라미터는 모두 `*Slug`로 표기

## 3.2 예시
- `lessonId`: `lesson-pane-split-1`
- `lessonSlug`: `pane-split-basics`
- 라우트: `/learn/:trackSlug/:chapterSlug/:lessonSlug`

## 4. 라우트 정규 표준
- `/`
- `/learn`
- `/learn/:trackSlug/:chapterSlug/:lessonSlug`
- `/practice`
- `/cheatsheet`
- `/playbooks`
- `/playbooks/:playbookSlug`
- `/playbooks/:playbookSlug/copied`
- `/bookmarks`
- `/progress`
- `/share/:milestoneSlug`
- `/onboarding/start`
- `/onboarding/goal`
- `/onboarding/preferences`
- `/onboarding/first-mission`
- `/onboarding/first-mission/passed`
- `/onboarding/done`

## 5. 분석 라우트 규칙
- Cloudflare Web Analytics 단일 소스 원칙 유지
- 이벤트는 가능하면 전용 라우트 진입으로 치환
- 예:
  - `/progress/missions/:missionSlug/passed`
  - `/playbooks/:playbookSlug/copied`
  - `/share/track-a-complete`

## 6. 콘텐츠 구조 규약
- 학습 콘텐츠 계층:
  - `Track > Chapter > Lesson > Mission`
- 실무 콘텐츠 계층:
  - `Playbook` (별도 카테고리)
- 플레이북 상세 내용의 정본은:
  - `/Users/hckim/repo/tmux-tuto/docs/specs/11_PRACTICAL_PLAYBOOKS_SPEC.md`

## 7. UX 카피 규약
- 금지:
  - 과장/선동형 표현
- 필수:
  - 실제로 수행 가능한 결과 표현
  - 실습 시간/난이도 명시

## 8. 문서 변경 규약
- 라우트 변경 시 반드시 동시 수정:
  - `/Users/hckim/repo/tmux-tuto/docs/specs/01_APP_ARCHITECTURE_SPEC.md`
  - `/Users/hckim/repo/tmux-tuto/docs/specs/05_ANALYTICS_CLOUDFLARE_SPEC.md`
  - `/Users/hckim/repo/tmux-tuto/docs/00_EXECUTION_TODOLIST.md`
- 플레이북 변경 시 반드시 동시 수정:
  - `/Users/hckim/repo/tmux-tuto/docs/specs/03_CURRICULUM_MISSION_SPEC.md`
  - `/Users/hckim/repo/tmux-tuto/docs/specs/08_CHEATSHEET_BOOKMARK_SPEC.md`
  - `/Users/hckim/repo/tmux-tuto/docs/specs/11_PRACTICAL_PLAYBOOKS_SPEC.md`

## 9. 품질 체크 최소 기준
- 문서 충돌 0건
- 주요 라우트 명칭 불일치 0건
- Todo 항목이 1 PR 단위로 분해되어 있을 것
