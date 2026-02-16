# 스펙: 고충실도 tmux 시뮬레이터

## 1. 목표
- 실제 tmux 실행 없이도 핵심 조작 학습을 가능한 수준으로 재현한다.
- 학습 성과 관점에서 Track A~C를 완전히 커버한다.

## 2. 비목표
- 셸/프로세스 실행 환경 완전 재현
- tmux 모든 옵션/플러그인 지원

## 3. 도메인 모델
## 3.1 엔티티
- `SimSession`
  - `id`, `name`, `windows[]`, `activeWindowId`, `attached`
- `SimWindow`
  - `id`, `name`, `panes[]`, `layout`, `activePaneId`
- `SimPane`
  - `id`, `title`, `buffer[]`, `cursor`, `zoomed`
- `SimState`
  - `sessions[]`, `activeSessionId`, `mode`, `prefix`, `history[]`

## 3.2 모드
- `NORMAL`
- `PREFIX_PENDING`
- `COMMAND_MODE`
- `COPY_MODE`
- `SEARCH_MODE`

## 4. 입력 처리
## 4.1 키입력 파이프라인
1. raw key event 수신
2. keymap 해석 (`Ctrl+b` or `Ctrl+a`)
3. 현재 모드에 따른 명령 resolve
4. reducer로 상태 변경
5. UI 렌더 + 이벤트 로그 기록

## 4.2 명령 지원 우선순위
- P0:
  - pane split horizontal/vertical
  - pane focus 이동
  - pane resize
  - window create/rename/next/prev
  - session create/switch/detach attach 개념
  - copy-mode 진입/검색/선택
- P1:
  - swap-pane
  - kill-pane/window/session
  - synchronize-panes 시뮬레이션

## 5. 명령 매핑 표준
- 내부 액션 ID 사용:
  - `sim.pane.split.vertical`
  - `sim.pane.split.horizontal`
  - `sim.pane.move.left`
  - `sim.window.new`
  - `sim.session.new`
- UI/키맵/치트시트는 액션 ID를 참조한다.

## 6. 상태 업데이트 규칙
- 모든 상태 변경은 pure reducer를 통과한다.
- 각 액션은 deterministic 해야 한다.
- undo/redo(최소 20스텝)를 지원한다.

## 7. Copy-mode 시뮬레이션
- 버퍼는 pane별 라인 배열로 관리한다.
- 기능:
  - 위/아래 이동
  - 문자열 검색
  - 선택 시작/끝
  - 복사 완료 메시지
- 실제 클립보드 연동은 옵션으로 분리한다.

## 8. 레이아웃 알고리즘
- 분할 단위는 트리 구조(`SplitNode`)로 저장:
  - type: `leaf` | `row` | `col`
  - ratio: number
  - children
- resize는 인접 분할 비율 변경으로 처리

## 9. 실제 tmux와 차이 처리
- 차이가 있는 동작은 우측 패널에 명시:
  - `SIMULATED: attach/detach는 개념 모델`
  - `SIMULATED: 실제 셸 프로세스는 실행되지 않음`
- 레슨마다 "실전 주의사항" 섹션 표시

## 10. 외부 인터페이스
## 10.1 Selector
- `selectActivePane()`
- `selectLayoutTree()`
- `selectMode()`
- `selectCommandHistory()`

## 10.2 Hook
- `useSimulatorInput()`
- `useSimulatorSnapshot()`
- `useSimulatorMetrics()`

## 11. 성능 요구사항
- 키 입력 반응 p95 < 80ms
- split/resize 연속 입력 시 dropped frame 최소화
- 상태 직렬화/복원 50ms 이하 (평균 상태 크기 기준)

## 12. 테스트 케이스
- prefix 후 유효/무효 키 처리
- 3단 분할 후 포커스 이동 정확성
- resize 경계값 처리 (최소 크기)
- copy-mode 검색 결과 0건/다건
- snapshot 저장 후 복원 동등성

## 13. 관찰 가능성
- 개발 모드에서 최근 액션 50개 디버그 패널 제공
- 시뮬레이터 에러코드 체계:
  - `SIM-E-INPUT`
  - `SIM-E-LAYOUT`
  - `SIM-E-STATE`

## 14. DoD
- Track A~C 미션 커버리지 95% 이상
- 핵심 액션 자동화 테스트 통과율 100%
- 사용자 관점에서 주요 tmux 학습 동작 재현 가능
