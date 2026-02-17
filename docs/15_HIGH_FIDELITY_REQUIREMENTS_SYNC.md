# HF-000 요구사항 동기화 요약

## 1. 기준 문서
- `/Users/hckim/repo/tmux-tuto/docs/specs/12_HIGH_FIDELITY_SHELL_TMUX_SIMULATOR_SPEC.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/13_CURRICULUM_SIMULATOR_COVERAGE_SPEC.md`

## 2. 단일 기준(SSOT) 합의
- 제품 범위 SSOT: 스펙 12
- 커리큘럼-기능 매핑 SSOT: 스펙 13
- 구현 API 계약 SSOT: 스펙 13의 공통 인터페이스 + 스펙 12의 Layer C 요구사항

## 3. 기능 축별 동기화 결과

### 3.1 Shell/Tmux 코어
- 스펙 12의 Shell/Tmux 요구사항은 스펙 13의 Track A~C 미션 요구 capability와 일치한다.
- Track A/B/C에서 필요한 `split/focus/resize`, `copy-mode search`, `command-mode subset`, `session/window navigation`은 스펙 12 섹션 5~6에 포함되어 있다.

### 3.2 커리큘럼 런타임 인터페이스
- `initScenario(scenarioPresetId)`는 스펙 12 섹션 9의 "레슨 진입 시 시나리오 주입" 요구와 합치된다.
- `evaluateMission(missionSlug)`는 스펙 12 섹션 9의 결정적 채점 요구와 합치된다.
- `saveSnapshot()`/`restoreSnapshot(id)`는 스펙 12 섹션 11의 저장/복구 우선순위와 합치된다.

### 3.3 학습 루프 연동
- cheatsheet/bookmark/playbook 연결 요구(스펙 12 섹션 10)는 스펙 13 섹션 7의 연결 규칙과 정합된다.
- 실패/힌트 설계(스펙 13 섹션 8)는 스펙 12 Layer C의 힌트 동기화 요구를 구체화한다.

## 4. 충돌 점검
- 점검 범위:
  - 기능 포함/제외 범위
  - 미션 채점 상태 필드
  - 필수 명령/키 subset
  - 저장/복구 책임
- 결과: 스펙 12/13 간 기능 충돌 **0건**

## 5. 구현 우선순위 반영
- P0: `HF-010~025`, `HF-040~041`, `HF-050`
- P1: `HF-042~045`, `HF-060~062`
- P2: `HF-063`, `HF-070~072`

## 6. 후속 작업 규칙
- 기능 추가 시 다음 2개를 동시에 갱신한다.
  - 스펙 12의 엔진/UX/저장 요구사항
  - 스펙 13의 미션 capability matrix
- 새 미션 추가 시 `scenarioPresetId`, pass/fail 상태 필드, 힌트 3단계를 동시에 정의한다.
