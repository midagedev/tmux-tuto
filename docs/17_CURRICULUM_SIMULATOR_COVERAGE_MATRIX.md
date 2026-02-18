# Curriculum Simulator Coverage Matrix (HF-043)

## 목적
- 스펙 13 기준으로 `missionSlug -> simulator capability` 매핑을 명시한다.
- 미션 규칙(`passRules`)과 시나리오(`scenarioPresetId`) 누락을 자동 검증한다.

## 기준 데이터
- 미션 정의: `src/content/v1/content.json`
- 매핑 테이블: `src/content/v1/coverage-matrix.json`
- 코드 접근: `src/features/curriculum/coverageMatrix.ts`
- 누락 검사 스크립트: `scripts/check-coverage-matrix.mjs`

## 매핑 테이블
| missionSlug | Track | scenarioPresetId | capabilities | requiredRuleKinds |
|---|---|---|---|---|
| session-create | A | single-pane | session.create, session.attach.simulated | sessionCount, actionHistoryText |
| session-window-create | A | single-pane | window.create | windowCount, actionHistoryText |
| session-multi-manage | A | single-pane | session.create, session.multi_manage | sessionCount, actionHistoryText |
| split-two-panes | A | single-pane | pane.split | paneCount, actionHistoryText |
| pane-grid-layout | B | single-pane | pane.split, pane.grid | paneCount, actionHistoryText |
| window-cycle-practice | B | single-pane | window.create, window.next, window.prev | windowCount, paneCount, actionHistoryText |
| copy-mode-search-keyword | B | log-buffer | copy-mode.enter, copy-mode.search, copy-mode.match | modeIs, searchExecuted, searchMatchFound |
| copy-mode-no-match | B | log-buffer | copy-mode.enter, copy-mode.search, copy-mode.no-match | modeIs, searchExecuted, searchMatchFound |
| command-mode-new-window | C | single-pane | command-mode.enter, command-mode.execute, window.create | windowCount, shellHistoryText |

## 검증 방법
- 실행: `pnpm verify:coverage-matrix`
- 실패 조건:
  - 미션 누락/초과 매핑
  - capability 누락
  - scenarioPresetId 불일치
  - requiredRuleKinds 대비 mission passRules 누락

## 결과 해석
- 성공 시 `missions`, `rows`, `capabilities` 집계가 출력된다.
- 실패 시 누락 항목을 한 줄씩 출력하고 종료 코드 1로 실패한다.
