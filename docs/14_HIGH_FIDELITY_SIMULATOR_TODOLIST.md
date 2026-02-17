# 실행 작업계획: High-Fidelity Shell + tmux Simulator

## 1. 기준 문서
- 요구사항 정본:
  - `/Users/hckim/repo/tmux-tuto/docs/specs/12_HIGH_FIDELITY_SHELL_TMUX_SIMULATOR_SPEC.md`
  - `/Users/hckim/repo/tmux-tuto/docs/specs/13_CURRICULUM_SIMULATOR_COVERAGE_SPEC.md`

## 2. 목표
- 브라우저에서 iTerm/Terminal에 가까운 체감의 셸 + tmux 실습 환경 제공
- Track A~C 미션을 동일 시뮬레이터로 완주 가능하게 구성
- cheatsheet/bookmark/playbook/progress와 연동된 학습 루프 완성

## 3. 작업 단위 규칙
- 1 Task = 1 commit (권장)
- 각 Task는 아래 4가지를 포함:
  - 산출물(코드/문서)
  - 의존 작업
  - 검증 방법
  - 완료 기준(DoD)
- 8시간 초과 예상 Task는 즉시 분할

## 4. 상세 TODO 체크리스트

### Phase 0. 설계 고정 (Contract/Model)
- [x] `HF-000` 요구사항 동기화
  - 산출물: 스펙 반영 변경점 요약 문서
  - 의존: 없음
  - 검증: 스펙 12/13 간 충돌 0건
  - DoD: 기능/범위/제약이 단일 기준으로 정리됨

- [x] `HF-001` Shell/Tmux 통합 상태모델 v2 정의
  - 산출물: `src/features/simulator/model.ts` 리팩터링
  - 의존: `HF-000`
  - 검증: 타입 체크 통과
  - DoD: `ShellSession`, `TmuxSession`, `TmuxPane`, `ModeState`를 타입으로 분리

- [ ] `HF-002` snapshot/저장 스키마 v2 설계
  - 산출물: storage types/migration 문서 및 코드
  - 의존: `HF-001`
  - 검증: migration 테스트 통과
  - DoD: 기존 snapshot과 호환 또는 안전 폴백 제공

### Phase 1. Shell Simulator Core
- [ ] `HF-010` 터미널 버퍼/뷰포트 엔진 구현
  - 산출물: line buffer, viewport, scrollback(3000+) 관리 모듈
  - 의존: `HF-001`
  - 검증: unit test(append/scroll/wrap)
  - DoD: 대량 로그에서도 정상 스크롤

- [ ] `HF-011` 입력 라인 에디터 구현
  - 산출물: 입력 줄 상태기계(Ctrl+A/E/U/K, backspace, enter)
  - 의존: `HF-010`
  - 검증: unit test(key input sequences)
  - DoD: 기본 셸 입력 편집이 자연스럽게 동작

- [ ] `HF-012` 셸 히스토리/프롬프트 구현
  - 산출물: history stack + Up/Down 탐색
  - 의존: `HF-011`
  - 검증: unit/integration 테스트
  - DoD: 커맨드 재실행이 즉시 가능

- [ ] `HF-013` pseudo command set v1 구현
  - 산출물: `pwd/ls/cd/mkdir/touch/cat/echo/grep/tail/clear/history/help`
  - 의존: `HF-011`
  - 검증: integration test(command -> output)
  - DoD: 커리큘럼 시나리오용 명령 세트 동작

- [ ] `HF-014` 가상 파일시스템 템플릿 구현
  - 산출물: scenario별 초기 fs 템플릿 로더
  - 의존: `HF-013`
  - 검증: scenario init 테스트
  - DoD: 레슨별 파일/로그 재현 가능

### Phase 2. tmux Engine High Fidelity
- [ ] `HF-020` 패인/윈도우/세션 그래프 강화
  - 산출물: 레이아웃 알고리즘 개선(single/vertical/horizontal/grid)
  - 의존: `HF-001`
  - 검증: reducer unit test
  - DoD: split/focus/kill/resize 안정성 확보

- [ ] `HF-021` 패인 클릭 포커스 + 휠 스크롤
  - 산출물: active pane 클릭 전환, pane별 scroll state
  - 의존: `HF-020`, `HF-010`
  - 검증: e2e smoke(클릭 포커스, 스크롤)
  - DoD: 마우스 기반 조작이 실제감 있게 동작

- [ ] `HF-022` 키 테이블/프리픽스 처리 고도화
  - 산출물: prefix timeout/repeat-table 포함 입력 파이프라인
  - 의존: `HF-020`
  - 검증: unit test(prefix sequence)
  - DoD: tmux key 느낌의 반응성 확보

- [ ] `HF-023` command-mode parser/dispatcher 확장
  - 산출물: 명령 파서 + registry 구조
  - 의존: `HF-022`
  - 검증: unit test(command parse + dispatch)
  - DoD: 스펙 12의 command subset 전부 처리

- [ ] `HF-024` copy-mode 스크롤/검색/매치 표시 강화
  - 산출물: search highlight, match index 상태
  - 의존: `HF-010`, `HF-020`
  - 검증: integration/e2e
  - DoD: copy-mode 실습 미션 수행 가능

- [ ] `HF-025` `.tmux.conf` parser v1 적용
  - 산출물: 설정 파서 + 적용 상태 + 에러 표시
  - 의존: `HF-022`, `HF-023`
  - 검증: unit test(valid/invalid config)
  - DoD: prefix/mouse/mode-keys/bind subset 반영

### Phase 3. 실제감 UI/UX
- [ ] `HF-030` 터미널 화면 스킨(상태바/윈도우바/프롬프트)
  - 산출물: Practice UI 재구성
  - 의존: `HF-010`, `HF-020`
  - 검증: 수동 QA(시각 일관성)
  - DoD: "터미널 같다"는 1차 체감 확보

- [ ] `HF-031` 패인 렌더링 컴포넌트 분리
  - 산출물: pane view component, active border, geometry overlay
  - 의존: `HF-021`
  - 검증: component test + e2e
  - DoD: 패인 상태가 직관적으로 식별됨

- [ ] `HF-032` 모드/명령 프롬프트 오버레이
  - 산출물: mode indicator + `:` 입력줄 UI
  - 의존: `HF-023`, `HF-024`
  - 검증: e2e(command-mode flow)
  - DoD: 입력/모드 전환이 헷갈리지 않음

- [ ] `HF-033` 접근성 강화
  - 산출물: 포커스 라우팅, `aria-live`, 키보드-only 동작 보완
  - 의존: `HF-030`
  - 검증: 키보드 내비 + axe 수동 점검
  - DoD: 핵심 조작 키보드만으로 수행 가능

### Phase 4. Curriculum Integration
- [ ] `HF-040` scenario preset 엔진
  - 산출물: lesson/mission별 초기 상태 주입기
  - 의존: `HF-014`, `HF-020`
  - 검증: integration test(init scenario)
  - DoD: 미션마다 재현 가능한 시작 상태 제공

- [ ] `HF-041` 미션 채점 어댑터 v2
  - 산출물: mission evaluator가 shell+tmux 상태 읽도록 확장
  - 의존: `HF-040`, `HF-024`
  - 검증: rule engine test 업데이트
  - DoD: Track A~C pass/fail 결정성 보장

- [ ] `HF-042` 힌트 엔진과 실시간 상태 연결
  - 산출물: 실패 상태 기반 단계별 힌트
  - 의존: `HF-041`
  - 검증: integration/e2e
  - DoD: 힌트가 실제 실패 원인과 일치

- [ ] `HF-043` coverage matrix 구현 반영
  - 산출물: 스펙 13 matrix 기준 미션-기능 매핑 테이블 코드/문서
  - 의존: `HF-041`
  - 검증: 누락 항목 체크 스크립트
  - DoD: 매핑 누락 0건

- [ ] `HF-044` cheatsheet -> simulator action 매핑 100%
  - 산출물: cheatsheet index/quick preset 확장
  - 의존: `HF-043`
  - 검증: e2e(검색 -> 실습)
  - DoD: 핵심 항목이 즉시 실습 전환됨

- [ ] `HF-045` bookmark snapshot deep-link
  - 산출물: 북마크에서 특정 스냅샷 재진입 지원
  - 의존: `HF-002`, `HF-050`
  - 검증: integration/e2e
  - DoD: 재진입 후 상태 일치

### Phase 5. Persistence & Recovery
- [ ] `HF-050` IndexedDB 저장 확장
  - 산출물: shell history/tmux config/simulator v2 snapshot 저장
  - 의존: `HF-002`
  - 검증: repository integration test
  - DoD: 새로고침 후 상태 복원

- [ ] `HF-051` import/export 포맷 v2
  - 산출물: backup schema 확장 + 변환기
  - 의존: `HF-050`
  - 검증: backup round-trip test
  - DoD: 데이터 유실 없이 복구

- [ ] `HF-052` 복구 UX 개선
  - 산출물: 최신 snapshot/lesson default 선택 복원 플로우
  - 의존: `HF-050`
  - 검증: 수동 QA + e2e
  - DoD: 복구 실패 시 안전 폴백

### Phase 6. Test/Quality
- [ ] `HF-060` unit 테스트 확장
  - 산출물: shell parser/keymap/command parser/reducer tests
  - 의존: Phase 1~2
  - 검증: `npm run test`
  - DoD: 신규 핵심 로직 테스트 커버

- [ ] `HF-061` integration 테스트 확장
  - 산출물: shell command->buffer, tmux action->layout, snapshot restore
  - 의존: `HF-050`
  - 검증: `npm run test`
  - DoD: 데이터 플로우 검증 통과

- [ ] `HF-062` e2e 시나리오 확장
  - 산출물: pane split/focus/scroll, copy-mode, config apply 플로우
  - 의존: Phase 3~4
  - 검증: `npm run test:e2e:smoke`
  - DoD: 주요 학습 플로우 회귀 방지

- [ ] `HF-063` 성능 측정 스크립트/리포트
  - 산출물: 입력 반응/스크롤 부하 기준 리포트
  - 의존: Phase 3
  - 검증: benchmark 결과 문서화
  - DoD: p95 목표치 충족 여부 명시

### Phase 7. Release
- [ ] `HF-070` 사용자 문서 업데이트
  - 산출물: 시뮬레이터 사용 가이드/제약 사항
  - 의존: Phase 3~5
  - 검증: 문서 리뷰
  - DoD: 기대치 관리 명확

- [ ] `HF-071` CI 게이트 확장
  - 산출물: lint/type/test/e2e/build 파이프라인 반영
  - 의존: `HF-060~062`
  - 검증: GitHub Actions 통과
  - DoD: 자동 품질 게이트 완성

- [ ] `HF-072` 최종 릴리즈 체크
  - 산출물: 릴리즈 체크리스트 + 게이트 리포트
  - 의존: `HF-063`, `HF-071`
  - 검증: 수동/자동 통합 점검
  - DoD: 배포 가능 상태 승인

## 5. 병렬 가능 작업
- 병렬 가능:
  - `HF-013` 과 `HF-020`
  - `HF-025` 과 `HF-031`
  - `HF-044` 과 `HF-050`
  - `HF-060` 과 `HF-063`
- 병렬 금지:
  - `HF-041` 이전의 미션 채점 고도화
  - `HF-050` 이전의 snapshot deep-link 구현

## 6. 마일스톤 게이트
- `M1` Shell 체감 확보: `HF-010~014` 완료
- `M2` tmux 핵심조작 확보: `HF-020~025` 완료
- `M3` 커리큘럼 완전 연동: `HF-040~045` 완료
- `M4` 저장/복구 안정화: `HF-050~052` 완료
- `M5` 테스트/배포 완료: `HF-060~072` 완료

## 7. 완료 정의
- Track A~C 모든 미션이 고충실도 시뮬레이터에서 실행/채점 가능
- 패인 분할/포커스/스크롤/copy-mode/command-mode가 실제감 있게 동작
- cheatsheet/bookmark/playbook/progress 연동 기능이 끊김 없이 이어짐
- CI/E2E/빌드/배포 파이프라인에서 안정적으로 검증됨
