# tmux-tuto 문서 인덱스

## 목적
- 이 디렉토리는 실제 구현을 위한 실행 계획과 기능 명세를 분리해 관리한다.
- `00_EXECUTION_TODOLIST.md`는 전체 작업 순서와 완료 기준을 정의한다.
- `specs/`는 기능별 상세 스펙을 정의한다.

## 문서 목록
- `/Users/hckim/repo/tmux-tuto/docs/01_PROJECT_CONVENTIONS.md`
- `/Users/hckim/repo/tmux-tuto/docs/02_DOC_ALIGNMENT_REPORT.md`
- `/Users/hckim/repo/tmux-tuto/docs/00_EXECUTION_TODOLIST.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/01_APP_ARCHITECTURE_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/02_TMUX_SIMULATOR_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/03_CURRICULUM_MISSION_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/04_LOCAL_STORAGE_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/05_ANALYTICS_CLOUDFLARE_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/06_SHARE_OG_TWITTER_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/07_QA_RELEASE_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/08_CHEATSHEET_BOOKMARK_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/09_GAMIFICATION_PROGRESS_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/10_UX_UI_ONBOARDING_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/11_PRACTICAL_PLAYBOOKS_SPEC.md`

## 문서 우선순위 (충돌 시)
1. `/Users/hckim/repo/tmux-tuto/docs/01_PROJECT_CONVENTIONS.md`
2. `/Users/hckim/repo/tmux-tuto/docs/specs/01_APP_ARCHITECTURE_SPEC.md`
3. 기능별 스펙 (`/Users/hckim/repo/tmux-tuto/docs/specs/*.md`)
4. 실행계획 (`/Users/hckim/repo/tmux-tuto/docs/00_EXECUTION_TODOLIST.md`)

## 사용 규칙
1. 기능 개발 전 관련 스펙 문서를 먼저 확정한다.
2. 모든 작업 PR은 `00_EXECUTION_TODOLIST.md`의 Task ID를 제목/본문에 포함한다.
3. 완료 판단은 각 스펙의 `DoD`와 `QA` 섹션 기준으로 한다.
4. 라우트 파라미터/식별자 네이밍은 `01_PROJECT_CONVENTIONS.md`를 따른다.
