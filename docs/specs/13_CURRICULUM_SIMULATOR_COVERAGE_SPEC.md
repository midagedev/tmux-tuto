# 스펙: Curriculum x Simulator Coverage Matrix

## 1. 목적
- 커리큘럼과 시뮬레이터 기능 간 매핑을 명시해 누락 기능을 방지한다.
- "미션 요구사항 -> 엔진 capability"를 역추적 가능하게 만든다.

## 2. 공통 인터페이스
- `initScenario(scenarioPresetId)`
- `dispatchKey(input)`
- `executeCommand(command)`
- `evaluateMission(missionSlug)`
- `saveSnapshot()` / `restoreSnapshot(id)`

## 3. Track A (Foundations)
| Lesson/Mission | 필수 기능 | 채점 포인트 |
|---|---|---|
| session-create | new session, attach(simulated) | session count >= 1 |
| session-window-create | new window | window count >= 2 |
| split-two-panes | split pane | pane count >= 2 |

## 4. Track B (Workflow)
| Lesson/Mission | 필수 기능 | 채점 포인트 |
|---|---|---|
| pane-grid-layout | multi split/grid | pane count >= 3 |
| window-cycle-practice | next/prev window | active window changed |
| copy-mode-search-keyword | copy-mode + search | search executed + match true |
| copy-mode-no-match | copy-mode + search | search executed + match false |

## 5. Track C (Deepwork)
| Lesson/Mission | 필수 기능 | 채점 포인트 |
|---|---|---|
| command-mode-new-window | command-mode parser | `new-window` applied |
| session-multi-manage | multi session management | session count >= 2 |
| split/resize advanced | resize-pane, focus-pane | pane geometry/focus changed |

## 6. 기능 커버리지 우선순위
## 6.1 P0 (필수)
- split/focus/resize
- copy-mode search
- command-mode subset
- session/window navigation
- snapshot save/restore

## 6.2 P1 (확장)
- choose-tree subset
- paste-buffer subset
- key-table customization 확대

## 6.3 P2 (장기)
- 더 넓은 tmux command coverage
- 복합 플러그인 동작 시뮬레이션

## 7. 치트시트/플레이북 연결 규칙
- 각 cheatsheet item은 최소 1개의 simulator action과 연결되어야 한다.
- playbook command는 simulator command-mode로 재실행 가능한 subset을 우선 채택한다.

## 8. 실패/힌트 설계
- 실패는 "어떤 상태가 부족한지"를 즉시 표시해야 한다.
- 힌트는 최대 3단계:
  1) 목표 재확인
  2) 키/명령 힌트
  3) 정답 경로 요약

## 9. 가시성 요구사항
- 각 레슨 상세에서 "이 미션이 쓰는 simulator 기능" 배지를 노출한다.
- Progress 페이지에서 기능별 숙련도(예: split/focus/copy-mode)를 표시한다.

## 10. 검증 체크리스트
- Track A~C 전체 미션이 `scenarioPresetId`로 재현 가능
- 모든 미션이 deterministic pass/fail 판정 가능
- quick practice 프리셋이 실제 미션 요구 동작과 일치
- 실패 시 힌트가 미션 목표와 정합

## 11. DoD
- 커리큘럼 항목 100%가 simulator capability와 매핑됨
- 매핑 누락 0건
- 신규 미션 추가 시 matrix 업데이트 규칙이 문서화됨
