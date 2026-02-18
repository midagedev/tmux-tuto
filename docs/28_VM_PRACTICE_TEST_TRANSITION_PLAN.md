# A5 테스트 갱신 범위 확정 (VM Practice 기준)

- 기준 이슈: #7
- 작성일: 2026-02-18
- 목적: 기존 smoke/e2e를 VM Practice 동선 기준으로 전환

## 1) 전환 원칙

- 사용자 핵심 경로 우선: `/learn -> /practice -> /progress -> /share`
- 레거시 시뮬레이터 셀렉터(`.sim-pane-card`, `Reset Simulator`) 의존 테스트는 VM 브리지 상태 기반 검증으로 치환
- 완료 피드백(미션/레슨/업적)과 마일스톤 공유를 독립 시나리오로 분리

## 2) 테스트 전환 매핑표 (기존 -> 신규)

| 기존 테스트 | 상태 | 신규 테스트 시나리오 | 주요 셀렉터/검증 포인트 |
| --- | --- | --- | --- |
| onboarding first mission flow completes | 유지(경로 축소) | learn에서 레슨 진입 후 practice VM 미션 1개 통과 | `#lesson-select`, `#mission-select`, 미션 결과 배지 |
| practice pane split click-focus and pane-scroll works | 교체 | VM quick command로 pane split 후 probe metric 반영 확인 | `window.__tmuxwebVmBridge.getStatus().metrics.paneCount` |
| practice state is restored after reload | 유지(검증방식 변경) | reload 후 progress/store 및 VM 상태 복원 | `completedMissionSlugs`, VM status text |
| practice command-mode overlay flow works | 교체 | command-mode 미션 통과 + action history 반영 | `selectedMissionStatus.pass`, actionHistory |
| practice keyboard-only routing works | 보류 | 키보드 접근성은 완료 피드백 UI E2E로 이동 | `Escape`, `Tab`, CTA focus |
| practice copy-mode search highlights... | 유지(간소화) | copy-mode 성공/실패 미션 각각 통과 검증 | `searchExecuted`, `searchMatchFound` metric |
| practice tmux config apply flow works | 제외 | 커리큘럼 리디자인 핵심 경로 밖으로 분리(추후 회귀군) | N/A |
| learn curriculum can start lesson ... | 유지 | Learn -> Practice deep link 정상 동작 | URL 파라미터(`lesson`, `mission`) |
| practice mobile layout stays within viewport | 유지 | 모바일 viewport에서 완료 카드/CTA 가시성 보장 | 완료 카드 root rect, overflow 없음 |
| cheatsheet search jump tests | 유지 | 치트시트에서 practice 진입 기본 경로 | `/practice` 이동 확인 |
| bookmark snapshot/lesson/recovery tests | 유지 | persistence 이슈(#12)와 묶어 회귀 실행 | IndexedDB + 복구 CTA |
| milestone share page can be opened from progress | 강화 | 마일스톤 조건 충족 후 slug별 share 링크 생성 검증 | `/share/{slug}` + 메타 렌더 |
| achievement probe e2e (skill/course) | 전면 수정 | v1 업적 카탈로그 기준 unlock 검증 | 신규 업적 title/id, 중복 해금 방지 |

## 3) 신규 E2E 최소 시나리오 세트

| 우선순위 | 시나리오 | 목적 |
| --- | --- | --- |
| P0 | Learn -> Practice 첫 미션 통과 | 핵심 진입 동선 보장 |
| P0 | Practice 미션/레슨/업적 완료 피드백 노출 | #13 수용 기준 검증 |
| P0 | Progress 마일스톤 링크 -> Share 페이지 | #11 정합성 검증 |
| P1 | Progress/업적/스트릭 새로고침 복원 | #12 영속성 검증 |
| P1 | 다중 업적 동시 해금 큐 순차 노출 | 완료 UI 안정성 검증 |
| P2 | 모바일 viewport에서 완료 카드 CTA 접근성 | 레이아웃/접근성 회귀 방지 |

## 4) Unit/Integration/E2E 분담 계획

| 레벨 | 추가/수정 범위 |
| --- | --- |
| Unit | `progressEngine` 업적 evaluator idempotency, streak 날짜 경계, milestone 계산 유틸 |
| Integration | content-schema + coverage-matrix 정합, Progress 렌더와 unlock 조건 일치 |
| E2E | P0/P1 시나리오 중심 smoke 재구성, 레거시 시나리오는 non-smoke 회귀군으로 이동 |

## 5) 전환 리스크 및 대응

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| 레거시 셀렉터 제거로 테스트 대량 실패 | smoke 신뢰도 저하 | VM 브리지 기반 헬퍼로 검증 포인트를 셀렉터 의존에서 상태 의존으로 전환 |
| VM 부팅 지연/환경 편차 | 간헐적 flaky 발생 | `waitForVmReady` 타임아웃/재시도 정책 표준화 |
| 업적 카탈로그 ID 변경 | E2E 기대값 불일치 | 업적 제목 대신 ID 매핑 상수 사용 + #10 머지 후 일괄 갱신 |

## 6) 구현 입력 체크리스트 (이슈 #14 전달)

- smoke 태그는 P0 시나리오만 유지
- VM 브리지 헬퍼(`waitForVmReady`, `sendVmProbe`)를 공통 유틸로 통합
- 완료 피드백 UI 검증에 `aria-live`, `Escape dismiss`, CTA 이동 포함
- 최종 게이트는 `npm run test`, `npm run test:e2e:smoke`, `npm run verify:coverage-matrix`

## 7) 완료 기준 점검

- 기존->신규 매핑표: 완료
- 우선순위 실행 계획: 완료
- 구현 이슈 참조 가능 상태: 충족

## 8) 실행 결과 (Issue #14, 2026-02-18)

- `npm run test`: 통과 (`29 files`, `101 tests`)
- `npm run test:e2e:smoke`: 통과 (`3 tests`)
- `npm run verify:coverage-matrix`: 통과 (`missions=16, rows=16, capabilities=21`)
- 최종 게이트 문서: `/Users/hckim/repo/tmux-tuto/docs/FINAL_GATE_REPORT.md`
