# 스펙: High-Fidelity Shell + tmux Simulator (Browser-Only)

## 1. 목표
- 사용자가 "iTerm/Terminal 같은 실제 터미널"을 쓰는 느낌으로 학습할 수 있어야 한다.
- 터미널 셸 시뮬레이터 위에서 tmux를 구성/조작하는 흐름을 제공해야 한다.
- 커리큘럼(Track A~C) 전 구간에서 동일한 시뮬레이터를 재사용해야 한다.
- 백엔드 없이 정적 웹앱에서 동작해야 한다.

## 2. 제품 원칙
1. Realism First
- 시각/입력/상태 전환은 실제 터미널과 유사해야 한다.

2. Deterministic Training
- 미션 채점 가능한 결정적 상태 전이를 보장해야 한다.

3. Learnability
- tmux 기능을 많이 제공하되, 난이도 단계별로 노출을 제어해야 한다.

4. Static-Only Constraint
- 브라우저 단독 실행 환경에서 가능한 방식으로 설계해야 한다.

## 3. 범위
## 3.1 포함
- 셸 시뮬레이터 렌더링(프롬프트/버퍼/스크롤/선택)
- tmux 세션/윈도우/패인/모드/명령/키맵 시뮬레이션
- `.tmux.conf` subset 적용
- 커리큘럼 미션 연동(시나리오 초기화/채점/힌트)
- 북마크/치트시트/플레이북과의 연결

## 3.2 제외
- 실제 OS 프로세스 실행(실제 PTY, 실제 tmux daemon)
- 외부 서버 SSH 세션 실행
- 임의 셸 스크립트 완전 실행

## 4. 아키텍처 (레이어)
## 4.1 Layer A: Terminal Shell Simulator
- 책임:
  - 터미널 화면 렌더링
  - 입력 줄(edit line) 처리
  - 스크롤백 관리
  - 가상 파일시스템/가상 프로세스 출력

- 데이터 모델(필수):
  - `ShellSession`
  - `ShellBufferLine`
  - `WorkingDirectory`
  - `History[]`
  - `PseudoFileSystem`

## 4.2 Layer B: tmux Simulation Engine
- 책임:
  - session/window/pane graph 상태
  - key table(prefix 포함) 해석
  - command-mode(`:`) 명령 실행
  - copy-mode 탐색/스크롤/선택

- 데이터 모델(필수):
  - `TmuxSession`
  - `TmuxWindow`
  - `TmuxPane`
  - `TmuxModeState`
  - `TmuxConfigState`

## 4.3 Layer C: Curriculum Runtime Adapter
- 책임:
  - 레슨 진입 시 초기 시나리오 주입
  - 미션 pass rule 평가용 상태 snapshot 제공
  - 힌트 단계 로직과 동기화

## 5. 셸 시뮬레이터 요구사항
## 5.1 렌더링
- 모노스페이스 기반 셀 단위 렌더(문자폭 일관성)
- 커서(blink), 프롬프트, ANSI 색상 subset 지원
- 줄바꿈(wrap), 탭 확장, viewport 스크롤
- 스크롤백 최소 3,000 라인

## 5.2 입력/편집
- 기본 입력 + 백스페이스 + 엔터
- 히스토리 탐색(Up/Down)
- 라인 편집 최소 subset:
  - Ctrl+A / Ctrl+E
  - Ctrl+U / Ctrl+K

## 5.3 pseudo command set (v1)
- 파일/경로:
  - `pwd`, `ls`, `cd`, `mkdir`, `touch`, `cat`
- 텍스트/로그:
  - `echo`, `grep`, `tail -n`, `tail -f(simulated)`
- 학습 보조:
  - `clear`, `history`, `help`
- tmux 브릿지:
  - `tmux` 명령어를 tmux engine으로 위임

## 5.4 가상 파일시스템
- 초기 tree를 시나리오별 템플릿으로 제공
- 파일은 텍스트 기반만 지원
- 미션별 "로그 파일", "설정 파일"을 deterministic하게 제공

## 6. tmux 엔진 요구사항
## 6.1 세션/윈도우/패인
- `new-session`, `attach`, `detach`(simulated)
- `new-window`, `rename-window`, `next-window`, `previous-window`
- `split-window -h/-v`, `kill-pane`, `select-pane`, `resize-pane`
- 패인 레이아웃:
  - single/vertical/horizontal/grid

## 6.2 모드 상태
- NORMAL
- PREFIX_PENDING
- COMMAND_MODE
- COPY_MODE
- SEARCH_MODE

## 6.3 키맵/테이블
- prefix 선택 지원: `Ctrl+b` / `Ctrl+a`
- 기본 테이블 subset:
  - `%`, `"`, `h/j/k/l`, `H/J/K/L`, `c`, `n`, `p`, `[`, `:`
- 사용자가 keybinding cheat를 즉시 열람 가능해야 함

## 6.4 command-mode subset (v1)
- `new-window`
- `new-session`
- `split-window -h/-v`
- `next-window`
- `previous-window`
- `select-pane -L/-R/-U/-D`
- `kill-pane`
- `copy-mode`

## 6.5 copy-mode
- 패인 버퍼 스크롤
- `/` 검색
- 검색 결과 존재 여부 표시
- copy-mode 진입/탈출 상태 노출

## 7. `.tmux.conf` 적용 스펙
- parser 범위(v1):
  - `set -g prefix`
  - `set -g mouse on|off`
  - `setw -g mode-keys vi|emacs`
  - `bind`, `unbind` subset
- 파일 로드 후 즉시 keymap/state 반영
- 문법 오류 시 line 단위 에러 메시지 표시

## 8. UI/UX 요구사항 (실제감)
## 8.1 시각 구성
- 상단: window tab/status line
- 중앙: pane split viewport (실제 terminal skin)
- 하단: command line / hint / mode indicator

## 8.2 상호작용
- 패인 클릭 시 포커스 전환
- 마우스 휠/트랙패드로 패인 스크롤
- 키 입력 캡처 영역이 아닌, "터미널 영역 자체"에서 입력

## 8.3 상태 표시
- 현재 prefix 상태, mode, active pane id, pane geometry 표시
- copy-mode 검색 쿼리/매치 상태 표시

## 9. 커리큘럼 연동 규격
- 레슨 진입 시 `scenarioPresetId` 전달
- 미션 채점은 다음 상태를 읽어야 함:
  - pane count
  - active pane
  - window/session count
  - mode
  - copy search executed
- Track A/B/C의 각 미션은 동일 엔진 API로 초기화/채점 가능해야 함

## 10. Cheatsheet/Bookmark/Playbook 연동
- cheatsheet 결과에서 시뮬레이터 preset 실행 가능
- playbook 명령 복사 후 simulator command line에 붙여넣어 검증 가능
- bookmark에서 특정 simulator state(snapshot id) 재진입 지원

## 11. 저장/복구
- IndexedDB 저장 항목:
  - simulator snapshot
  - shell history
  - tmux config profile
- 복구 우선순위:
  1. latest snapshot
  2. lesson default scenario

## 12. 분석 포인트 (Cloudflare route 기반)
- `/practice` 방문
- `/onboarding/first-mission/passed`
- `/progress/missions/:missionSlug/passed`
- `/playbooks/:playbookSlug/copied`

## 13. 성능/품질 기준
- 입력 반응 p95 < 80ms
- pane split/focus 시 반응 p95 < 100ms
- 4-pane + 3000 lines scroll에서 프레임 드랍 체감 최소화
- Lighthouse Accessibility >= 90

## 14. 테스트 요구사항
## 14.1 Unit
- keymap parser
- command-mode parser
- reducer state transition

## 14.2 Integration
- shell command -> buffer 반영
- tmux command -> pane/window/session 반영
- snapshot save/restore

## 14.3 E2E
- pane split/focus/resize
- copy-mode search + scroll
- cheatsheet -> quick practice
- lesson scenario -> pass route

## 15. Non-functional 제약
- 완전한 tmux 호환(100%)은 목표가 아님
- 정적 앱 제약상 실제 PTY 기반 동작은 제공하지 않음
- 대신 "학습 목적의 고충실도 체감"을 최우선 목표로 둔다

## 16. DoD
- 사용자가 실제 터미널처럼 pane split/focus/scroll을 수행 가능
- Track A~C 미션을 동일 시뮬레이터로 완주 가능
- keybinding/command/copy-mode 핵심 루틴이 안정적으로 동작
- 테스트/배포 파이프라인에서 자동 검증 가능
