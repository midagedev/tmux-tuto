# HF-002 snapshot/저장 스키마 v2

## 1. 결정
- 현재 서비스는 미배포 상태이므로 레거시 snapshot 호환/마이그레이션은 수행하지 않는다.
- simulator snapshot 저장 포맷은 v2 하나만 지원한다.

## 2. 저장 레코드 스키마
- store: `simulator_snapshots`
- record:
  - `id: string`
  - `schemaVersion: 2`
  - `mode: 'NORMAL' | 'PREFIX_PENDING' | 'COMMAND_MODE' | 'COPY_MODE' | 'SEARCH_MODE'`
  - `sessionGraph: { schemaVersion: 2; simulatorState: unknown }`
  - `savedAt: ISO date string`

## 3. DB 마이그레이션
- DB version: `3`
- migration v3:
  - `simulator_snapshots` store에 `by-schemaVersion` index 보장
  - 기존 `by-savedAt` index 유지

## 4. 복원 정책
- 복원 대상은 아래 조건을 모두 만족해야 한다.
  - `snapshot.schemaVersion === 2`
  - `snapshot.sessionGraph.schemaVersion === 2`
  - `simulatorState`가 v2 상태 구조를 만족
- 조건 미충족 시 복원하지 않고 안내 메시지를 출력한다.

## 5. 검증
- migration test: v2 -> v3 upgrade 시 `by-schemaVersion` index 생성 확인
- repository integration test: 최신 snapshot 정렬 동작 확인
- lint/typecheck/test/e2e/build 게이트 통과
