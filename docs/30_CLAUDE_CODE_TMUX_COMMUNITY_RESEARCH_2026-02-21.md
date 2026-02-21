# Claude Code + tmux 커뮤니티 조사 (2026-02-21)

## 목적
- 공식 문서 요약보다, 커뮤니티에서 사람들이 **실제로 많이 묻는 것**과 **실전 팁으로 공유하는 것**을 파악한다.
- 레퍼런스/유즈케이스 콘텐츠에 바로 반영할 수 있는 주제를 뽑는다.

## 조사 범위
- 기준일: 2026-02-21
- 소스:
  - GitHub `anthropics/claude-code` 이슈 (`tmux` 검색)
  - Reddit (`r/ClaudeCode`, `r/ClaudeAI`, `r/tmux` 등 `claude code tmux` 연관 검색)
- HN(Algolia)은 동 키워드로 유의미 결과 거의 없음.

## 빠른 요약
1. 커뮤니티의 최대 관심사는 "설정 문법"보다 **멀티 세션 운영**이다.
2. 가장 많이 나오는 질문은 "병렬 에이전트를 어떻게 안전하게 돌릴까"와 "터미널 UI 깨짐/멈춤"이다.
3. 많이 공유되는 팁은 공통적으로:
- `git worktree + tmux` 조합으로 충돌 회피
- 장시간 작업은 별도 tmux 세션에서 실행 후 `capture-pane`로 로그 수집
- Agent Teams는 `tmux` 모드로 가시성 확보
4. 반복 장애 포인트는 `send-keys` 타이밍, split-pane 감지, resume picker TUI, scrollback 성능이다.

## 커뮤니티가 주로 궁금해하는 것

### 1) 병렬 에이전트 운영 방식
- "여러 Claude 세션을 탭으로 관리하기 너무 복잡하다"
- "Agent Teams를 in-process로 둘지 tmux split으로 볼지"
- "에이전트 상태(실행/대기/유휴)를 한 번에 보고 싶다"

근거 사례:
- Reddit: "Highly recommend tmux mode with agent teams" (r/ClaudeCode)
- Reddit: "I got tired of managing 15 terminal tabs..." (r/ClaudeCode)
- Reddit: "Anyone else using tmux as a bootleg orchestration system?" (r/ClaudeCode)

### 2) 같은 저장소에서 다중 에이전트 충돌
- "동일 repo에서 에이전트 2~3개 돌리면 파일 덮어쓰기/충돌이 난다"
- 해결책으로 `git worktree`를 거의 표준처럼 추천

근거 사례:
- Reddit: "Stop running multiple Claude Code agents in the same repo. Use worktrees..."

### 3) 장시간 프로세스(개발 서버/로그)와 대화 세션 분리
- "`pnpm dev` 같은 long-running command 때문에 대화가 막힌다"
- `tmux new-session -d`, `tmux capture-pane`, `tmux attach` 패턴이 자주 공유됨

근거 사례:
- Reddit: "How I run dev servers in claude code without blocking the chat"

### 4) Agent Teams + tmux 모드 신뢰성
- 설정을 했는데 split-pane이 안 뜨고 in-process로 떨어지는 케이스
- 특히 iTerm2/Windows/TTY 감지 경계에서 질문이 많이 발생

근거 사례:
- GitHub #23815 (iTerm2 split-pane 미동작)
- GitHub #26244 (Windows `isTTY` 경계에서 `teammateMode: "tmux"` 무시)

### 5) UI/입력 계열 문제
- statusline 세로 렌더링
- resume picker 무한 대기
- 장시간 사용 후 scrollback 지연/CPU 증가

근거 사례:
- GitHub #27158 (tmux에서 startup 시 statusline 세로 렌더)
- GitHub #22227 (`claude --resume` picker hang, tmux+Alacritty)
- GitHub #4851 (tmux+VSCode 터미널 scrollback 성능 저하)
- GitHub #25466 (WezTerm split에서 statusline 세로 렌더)

## 커뮤니티에서 자주 공유되는 실전 팁

### 팁 A) `git worktree + tmux`를 한 세트로 사용
- 에이전트마다 worktree/branch 분리
- 에이전트마다 tmux session 분리
- 이 조합이 충돌 감소에 가장 자주 추천됨

예시 흐름:
```bash
git worktree add ../myapp-feature-oauth feature/oauth
tmux new -s agent-oauth -c ../myapp-feature-oauth
```

### 팁 B) long-running 작업은 별도 tmux 세션으로 격리
- 메인 대화 세션에서 서버를 직접 띄우지 않음
- 별도 session에서 실행 후 로그만 수집

예시 흐름:
```bash
tmux new-session -d -s dev-server 'pnpm dev'
tmux capture-pane -t dev-server -p | tail -50
# 필요 시 attach
# tmux attach -t dev-server
```

### 팁 C) Agent Teams는 가시성 확보 목적에서 tmux 모드 선호
- 각 teammate를 pane에서 직접 관찰
- 이상 동작 시 빠르게 개입(Ctrl+C 등)
- 원격 접속(SSH)으로 붙어 중간 개입하는 운영 방식 공유됨

### 팁 D) tmux 자동화 시 `send-keys` 타이밍 주의
- 너무 빨리 보내면 입력이 실행되지 않고 줄바꿈만 남는 사례 다수
- delay/retry/wrapper를 둔다는 팁 반복

근거 사례:
- GitHub #23513 (pane 생성 직후 `send-keys` race)
- Reddit 토론에서도 "delay 추가" 팁 반복

### 팁 E) `capture-pane` 기반 관측/자동화
- 에이전트 출력/백엔드 로그를 `capture-pane`로 수집
- 모니터링/리뷰/후속 자동화에 활용

근거 사례:
- GitHub #2929 (tmux `send-keys` + `capture-pane`로 다중 인스턴스 제어 시도)
- Reddit 토론에서 `capture-pane` 활용 다수 언급

## 반복되는 장애 포인트(콘텐츠화 우선순위)
1. `teammateMode`를 `tmux`로 줬는데 split-pane이 안 뜨는 문제
2. `send-keys` race로 명령이 실행되지 않는 문제
3. `resume`/picker 계열 TUI 멈춤
4. 장시간 세션에서 scrollback/CPU 문제
5. startup 시 terminal columns 감지 이상으로 statusline 세로 렌더

## 레퍼런스/유즈케이스 반영 제안
- 페이지 내 "코딩에이전트 CLI + tmux" 섹션을 따로 두고 아래 4개를 고정 카드화:
  1. 병렬 에이전트 안전 운영 (`worktree + tmux`)
  2. dev server/log 분리 운영 (`new-session -d`, `capture-pane`)
  3. Agent Teams tmux 모드 점검 체크리스트
  4. UI 깨짐/멈춤 트러블슈팅 (resume, statusline, scrollback)
- 각 카드에 "증상 → 확인 명령 → 우회책" 3단 구조 적용.

## 데이터 스냅샷
- Reddit API 기반 검색 표본:
  - raw posts: 136
  - relevant posts: 74
  - 분포(복수 태그):
    - setup/workflow: 63
    - bugs/display/scroll: 24
    - agent teams/parallel: 21
    - notifications/monitoring: 15
- GitHub:
  - `repo:anthropics/claude-code is:issue tmux` 검색 total_count: 801
  - 주의: 이 수에는 이슈 템플릿의 환경 항목(예: Terminal: tmux)으로만 포함된 케이스가 섞여 있음.

## 출처 링크

### GitHub Issues
- https://github.com/anthropics/claude-code/issues/23513
- https://github.com/anthropics/claude-code/issues/23815
- https://github.com/anthropics/claude-code/issues/26244
- https://github.com/anthropics/claude-code/issues/22227
- https://github.com/anthropics/claude-code/issues/4851
- https://github.com/anthropics/claude-code/issues/27158
- https://github.com/anthropics/claude-code/issues/25466
- https://github.com/anthropics/claude-code/issues/2929

### Reddit Posts
- https://www.reddit.com/r/ClaudeCode/comments/1qynsma/highly_recommend_tmux_mode_with_agent_teams/
- https://www.reddit.com/r/ClaudeCode/comments/1pxyn37/i_got_tired_of_managing_15_terminal_tabs_for_my/
- https://www.reddit.com/r/ClaudeCode/comments/1qz8tyy/how_to_set_up_claude_code_agent_teams_full/
- https://www.reddit.com/r/ClaudeAI/comments/1qzduim/stop_running_multiple_claude_code_agents_in_the/
- https://www.reddit.com/r/ClaudeCode/comments/1osd9y1/anyone_else_using_tmux_as_a_bootleg_orchestration/
- https://www.reddit.com/r/ClaudeAI/comments/1l9f0jm/how_i_run_dev_servers_in_claude_code_without/
- https://www.reddit.com/r/tmux/comments/1ps44vy/tmux_tip_add_file_paths_to_context_with_fzf_in/

## 메모
- 커뮤니티 데이터는 self-promo/광고성 포스트가 섞여 있어, 본문 반영 시에는 "반복 등장 패턴" 위주로 필터링해야 함.
- 특히 에디터/터미널/OS 조합에 따라 재현성이 달라, 레퍼런스에는 항상 환경 체크 항목(터미널, tmux 버전, OS, shell)을 포함하는 것이 좋다.
