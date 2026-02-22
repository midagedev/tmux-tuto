# High-Fidelity Simulator User Guide

## 1. 목적
- Practice 페이지에서 tmux 실습을 빠르게 수행하는 방법을 정리한다.
- 실제 tmux와 시뮬레이터의 차이를 명확히 안내해 기대치를 맞춘다.

## 2. 시작 경로
- 기본 진입: `/practice`
- Cheatsheet 바로 실습: `/practice?from=<presetId>`
- 북마크 스냅샷 복원: `/practice?snapshot=<snapshotId>`
- 레슨 기본 시나리오 복원: `/practice/<lessonSlug>`

## 3. 핵심 조작
### 3.1 기본 버튼
- `Prefix`: 현재 prefix 키(`C-b` 또는 `C-a`) 입력
- `Split Vertical` / `Split Horizontal`: pane 분할
- `New Window` / `New Session`: tmux window/session 생성
- `Enter Copy Mode` / `Exit Mode`: copy-mode 진입/종료

### 3.2 Command Mode
- `Command mode input`에 tmux subset 명령 입력 후 `Run Command` 실행
- 지원 예시:
  - `new-window`
  - `new-session`
  - `split-window -h`
  - `split-window -v`
  - `select-pane -L|-R|-U|-D`
  - `kill-pane`
  - `copy-mode`

### 3.3 Copy Mode
- `Enter Copy Mode` 후 `Run Search`로 검색 실행
- `n` / `N`으로 다음/이전 매치 이동
- 결과는 pane 본문 하이라이트 및 `Copy Mode` 상태 패널에 반영

## 4. 저장/복구
- `Save Snapshot`: 현재 상태를 IndexedDB(`simulator_snapshots`)에 저장
- `Restore Latest Snapshot`: 최신 v2 snapshot 복원
- `Run Recovery`:
  - `latest snapshot` 선택 시 최신 snapshot 우선 복원
  - 실패 시 입력된 `lesson slug` 기반 기본 시나리오로 폴백
  - 레슨 복원도 실패하면 `RESET`으로 안전 폴백
- 앱 진입 시 자동 hydration 및 autosave(`snapshot-auto-latest`)가 동작

## 5. 학습 루프 연동
- Cheatsheet: 항목별 `바로 실습`으로 preset 진입
- Playbook: 명령 복사 후 command mode에서 재실행 가능
- Bookmarks:
  - snapshot 북마크는 특정 상태 재진입
  - lesson 북마크는 lesson 기본 시나리오 진입

## 6. 제약 사항
- 실제 PTY/SSH/tmux 프로세스는 실행하지 않는다.
- 학습 목적 subset만 지원하며 tmux 100% 호환이 목표가 아니다.
- 복잡한 플러그인/실서버 상태 재현은 범위 밖이다.

## 7. 문제 해결
- 상태가 꼬였을 때:
  1. `Reset Simulator`
  2. `Restore Latest Snapshot`
  3. `Run Recovery` + lesson slug
- `tmux source-file .tmux.conf` 적용이 안 되면:
  - `.tmux.conf` 파일 경로와 문법을 다시 확인
  - `Tmux Config > errors`와 `Action History`를 확인

## 8. 참고 문서
- `/Users/hckim/repo/tmux-tuto/docs/specs/12_HIGH_FIDELITY_SHELL_TMUX_SIMULATOR_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/16_SIMULATOR_SNAPSHOT_SCHEMA_V2.md`
- `/Users/hckim/repo/tmux-tuto/docs/18_HIGH_FIDELITY_SIMULATOR_PERFORMANCE_REPORT.md`
