# tmux Reference Use-case Research (2026-02-21)

## 목적
- 레퍼런스 페이지를 "명령 사전" 중심에서 "실전 유즈케이스" 중심으로 보강하기 위한 근거 자료를 정리한다.
- 사용자가 어디에서 자주 막히는지(질문량/미해결 비율/주제 분포) 확인하고, 콘텐츠 우선순위를 도출한다.

## 조사 범위
- 기간: 2024-01-01 ~ 2026-02-21 (최근 추세), + 누적 인기 질문 샘플
- 채널:
  - Stack Overflow, Super User, Unix & Linux (Stack Exchange API)
  - GitHub `tmux/tmux` Issues (GitHub Search API)
  - Reddit `r/tmux` 상위 게시글(참고)

## 조사 방법
1. `tmux` 태그 질문 메타데이터(제목/점수/답변 수/생성일)를 수집.
2. 질문 제목 키워드 기반으로 카테고리 분류.
3. 최근 질문(2024~)과 누적 인기 질문(고득표)을 분리해 비교.
4. 카테고리별 미해결 비율(`is_answered=false` 또는 `answer_count=0`) 산출.

> 주의: 카테고리 분류는 제목 기반 휴리스틱이므로 일부 오분류 가능성이 있다.

## 정량 요약

### 1) 질문 풀 규모(누적)
- Stack Overflow: `tmux` 태그 1,890
- Super User: `tmux` 태그 1,121
- Unix & Linux: `tmux` 태그 1,379

### 2) 샘플 A (인기+최신 혼합, 중복 제거 599개)
- 상위 카테고리
  - `window/pane/layout/navigation`: 168
  - `session/attach/detach/persistence`: 154
  - `compatibility/terminal`: 88
  - `keybinding/prefix`: 85
  - `copy/clipboard/scrollback`: 70

### 3) 샘플 B (최근 질문 2024~2026, 163개)
- 1차 분류(단일 우선순위 분류 기준)
  - `session_attach_detach_persistence`: 42 (25.8%)
  - `window_pane_layout_navigation`: 24 (14.7%)
  - `keybinding_prefix_keys`: 23 (14.1%)
  - `compatibility_terminal`: 18 (11.0%)
  - `copy_clipboard_scrollback`: 12 (7.4%)

### 4) 최근 질문 기준 미해결 비율(참고)
- `window/pane/layout`: 54.2%
- `compatibility/terminal`: 50.0%
- `session`: 47.6%
- `copy/clipboard`: 50.0%
- `keybinding`: 47.8%
- (`config/plugin`, `ssh/nested`, `performance`는 표본이 작아 변동성 큼)

## 사용자 난관(핵심 인사이트)
1. **상태 경계 혼동**
   - 터미널 에뮬레이터 / tmux / 쉘·에디터 경계가 섞여, 키 입력·렌더링·클립보드 동작 원인이 불명확해짐.
2. **버전 드리프트**
   - 구버전 설정/블로그 가이드와 최신 tmux 버전 사이의 옵션 차이로 실패.
3. **원격/중첩 시나리오 복잡도**
   - SSH + nested tmux + 로컬 클립보드(OSC52) 조합에서 체감 난이도 급증.
4. **명령 문법보다 운영 루틴 결핍**
   - 사용자는 `split-window` 문법보다 "끊김 없는 복구 루틴"을 원함.
5. **키바인딩 충돌 및 지연**
   - prefix, escape-time, modifier 조합이 터미널/OS별로 달라 재현이 어려움.

## 레퍼런스 보강 우선순위(권고)
1. **세션 생존 루틴**
   - `new -As`, `detach/attach`, 다중 세션 식별/복구 절차
2. **로그 검색 + 복사 + 시스템 클립보드**
   - copy-mode, history-limit, mouse, OSC52 분기
3. **키 입력 문제 해결**
   - prefix 충돌, escape-time, nested 전달(`send-prefix`) 체크리스트
4. **레이아웃 운영 루틴**
   - 분할/리사이즈/줌/재정렬을 작업 시나리오로 제공
5. **터미널 호환 트러블슈팅**
   - TERM/terminfo/truecolor/cursor/font 렌더 진단 흐름
6. **설정 운영 가이드**
   - reload 안전 패턴, 버전 분기, plugin 충돌 점검

## 레퍼런스 페이지 적용안
- 섹션 A: 기본 사용법(개념 + 3분 빠른 시작)
- 섹션 B: 유즈케이스 카드(상황/증상/즉시 실행 루틴/관련 레슨)
- 섹션 C: 코딩 에이전트 CLI 연동
  - 예: "코드 수정 + 테스트 + 로그 모니터링"을 tmux 3-pane/2-window로 운영
  - 관련 레슨 연결: split, pane focus, command mode, session persistence

## 대표 사례 링크
- How do I scroll in tmux? (Super User)
- How do I reorder tmux windows? (Super User)
- How do I increase the scrollback buffer size in tmux? (Stack Overflow)
- Restore tmux session after reboot (Super User)

## 출처 (원문 API/문서)
- https://api.stackexchange.com/2.3/tags/tmux/info?site=stackoverflow
- https://api.stackexchange.com/2.3/tags/tmux/info?site=superuser
- https://api.stackexchange.com/2.3/tags/tmux/info?site=unix
- https://api.stackexchange.com/2.3/questions?order=desc&sort=votes&tagged=tmux&site=stackoverflow&pagesize=100&filter=%21-%2AjbN-o8P3E5
- https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&tagged=tmux&site=stackoverflow&pagesize=100&filter=%21-%2AjbN-o8P3E5
- https://api.stackexchange.com/2.3/questions?order=desc&sort=votes&tagged=tmux&site=superuser&pagesize=100&filter=%21-%2AjbN-o8P3E5
- https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&tagged=tmux&site=superuser&pagesize=100&filter=%21-%2AjbN-o8P3E5
- https://api.stackexchange.com/2.3/questions?order=desc&sort=votes&tagged=tmux&site=unix&pagesize=100&filter=%21-%2AjbN-o8P3E5
- https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&tagged=tmux&site=unix&pagesize=100&filter=%21-%2AjbN-o8P3E5
- https://api.github.com/search/issues?q=repo%3Atmux%2Ftmux+is%3Aissue+is%3Aopen&sort=created&order=desc&per_page=100
- https://api.github.com/search/issues?q=repo%3Atmux%2Ftmux+is%3Aissue+is%3Aopen&sort=comments&order=desc&per_page=100
- https://api.github.com/search/issues?q=repo%3Atmux%2Ftmux+is%3Aissue+is%3Aclosed&sort=created&order=desc&per_page=100
- https://www.reddit.com/r/tmux/top/.json?t=year&limit=100
- https://github.com/tmux/tmux/wiki/FAQ
- https://github.com/tmux/tmux/wiki/Advanced-Use
- https://github.com/tmux/tmux/wiki/Clipboard
- https://github.com/tmux/tmux/wiki/Modifier-Keys

## 다음 액션
- Reference Hub에 "기본 사용법" + "유즈케이스" + "코딩 에이전트 CLI 연동" 섹션을 추가한다.
- 각 유즈케이스 카드에 즉시 실행 루틴과 연결 레슨 링크를 포함한다.
