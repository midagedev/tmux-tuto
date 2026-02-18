# A1 커리큘럼 재설계 시트 (레슨-미션-룰 매핑)

- 기준 콘텐츠: `src/content/v1/content.json`
- 기준 목표: 레슨 목표와 미션 passRules 1:1 매핑
- 작성일: 2026-02-18

## 레슨 구조 요약

| Track | Chapter | lessonSlug | 레슨 제목 | 핵심 행동(2~3개) |
| --- | --- | --- | --- | --- |
| Track A | tmux-onramp | hello-tmux | 첫 3분: tmux 맛보기 | tmux 명령 1회 실행, 세션 유지 개념 이해, 다음 실습 준비 |
| Track A | session-window-pane | basics | 기본 조작: Session/Window/Pane | session 생성, window 생성/전환, pane 구조 이해 |
| Track A | session-lifecycle | attach-detach | 세션 유지 루틴 | detach/attach, session 목록 확인, 재접속 루틴 |
| Track B | split-and-move | split-resize | 분할과 리사이즈 | vertical split, horizontal split, pane 크기 조절 |
| Track B | pane-navigation | pane-focus-flow | 패인 이동 루틴 | pane focus 이동, window 순환, 작업 분배 |
| Track C | copy-mode-search | copy-search | Copy Mode 검색 | copy-mode 진입, 검색 실행, 성공/실패 판단 |
| Track C | command-mode-workflow | command-subset | Command Mode 운영 | 명령 모드 진입, new-window 실행, split/kill 이해 |

## 레슨-미션-룰 매핑표

| lessonSlug | objective | missionSlug | ruleKinds | acceptance |
| --- | --- | --- | --- | --- |
| hello-tmux | tmux 명령 1회 실행 | hello-tmux-version-check | shellHistoryText | `tmux -V` 실행 기록이 쉘 히스토리에 존재 |
| basics | session 생성과 기본 workspace 시작 | session-create | sessionCount | session 수가 1개 이상 |
| attach-detach | window 생성 후 세션 유지 상태 확인 | session-window-create | windowCount | window 수가 2개 이상 |
| attach-detach | 복수 세션 운영 능력 확인 | session-multi-manage | sessionCount | session 수가 2개 이상 |
| split-resize | 패인 분할로 멀티태스킹 구성 | split-two-panes | paneCount | pane 수가 2개 이상 |
| pane-focus-flow | pane 다중 구성 및 이동 준비 | pane-grid-layout | paneCount | pane 수가 3개 이상 |
| pane-focus-flow | window 순환 이동 루틴 확인 | window-cycle-practice | windowCount, activeWindowIndex | window 2개 이상 + 활성 window index가 1 이상 |
| copy-search | copy-mode에서 검색 실행 | copy-mode-search-keyword | modeIs, searchExecuted, searchMatchFound | mode가 copy-mode이고 검색 실행/매치 성공 |
| copy-search | 검색 실패 케이스까지 판별 | copy-mode-no-match | modeIs, searchExecuted, searchMatchFound | mode가 copy-mode이고 검색 실행 + 매치 실패 |
| command-subset | command mode 기반 제어 진입 | command-mode-new-window | windowCount, activeWindowIndex | window 2개 이상 + 활성 window index가 1 이상 |

## 레슨별 미션 구성 요약

| lessonSlug | missionCount | 종합 미션 포함 여부 | 비고 |
| --- | --- | --- | --- |
| hello-tmux | 1 | 아니오 | 온램프 1회 성공 경험 중심 |
| basics | 1 | 아니오 | 핵심 개념 진입 단계 |
| attach-detach | 2 | 예 | `session-multi-manage`가 복수 세션 운영 종합 미션 |
| split-resize | 1 | 아니오 | 분할/리사이즈 기본기 확인 |
| pane-focus-flow | 2 | 예 | `window-cycle-practice`가 고난도 이동 루틴 종합 미션 |
| copy-search | 2 | 예 | 성공/실패 페어 시나리오로 검색 판단력 강화 |
| command-subset | 1 | 아니오 | command mode 진입 및 실행 확인 |

- Track B/C 난이도 상승 구간: `pane-focus-flow`, `copy-search`에서 실전형 조건(복합 rule kind, 실패 케이스 판별)을 포함해 난이도를 단계적으로 올렸다.

## 검증 요약

- 전체 lesson 7개 모두 매핑표 포함
- 전체 mission 10개 모두 매핑표 포함
- 미션별 rule kind가 실제 `passRules.kind`와 일치
- 충돌 항목: 없음

## 결정 메모

- 각 레슨의 미션 수는 1~2개이며, Track B/C에서는 종합 성격 미션으로 난이도 상승을 반영했다.
- 이후 `#8` 구현 이슈에서 레슨당 미션 수를 2~3개로 확장할지 여부는 사용자 피로도와 E2E 유지비를 함께 검토해 결정한다.
