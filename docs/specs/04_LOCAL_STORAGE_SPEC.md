# 스펙: 로컬 저장소/마이그레이션/백업복구

## 1. 목표
- 사용자 진행 데이터 전체를 브라우저 로컬에 안전하게 저장한다.
- 버전 업 시 마이그레이션과 복구 경로를 제공한다.

## 2. 저장 전략
- 주 저장소: `IndexedDB`
- 경량 설정: `localStorage`
- 임시 캐시: 메모리 store

## 3. IndexedDB 스토어 설계
## 3.1 stores
- `profile`
- `progress`
- `mission_attempts`
- `bookmarks`
- `notes`
- `achievements`
- `simulator_snapshots`
- `backup_meta`

## 3.2 primary/index
- `progress`
  - key: `lessonId`
  - indexes: `updatedAt`, `status`
- `mission_attempts`
  - key: auto increment
  - indexes: `missionId`, `createdAt`
- `bookmarks`
  - key: `id`
  - indexes: `type`, `createdAt`

## 4. 데이터 포맷
## 4.1 progress
```json
{
  "lessonId": "lesson-pane-split",
  "status": "in_progress",
  "bestScore": 82,
  "completedMissions": ["mission-split-2x2"],
  "updatedAt": "2026-02-16T12:00:00.000Z"
}
```

## 4.2 simulator snapshot
```json
{
  "id": "snap-001",
  "mode": "NORMAL",
  "sessionGraph": {},
  "savedAt": "2026-02-16T12:05:00.000Z"
}
```

## 5. 접근 계층(Repository)
- 모든 저장/조회는 repository 함수로만 접근
- 필수 API:
  - `getProgress(lessonId)`
  - `saveProgress(progress)`
  - `appendMissionAttempt(attempt)`
  - `saveSnapshot(snapshot)`
  - `exportAllData()`
  - `importAllData(payload, mode)`
  - `resetAllData()`

## 6. 마이그레이션
## 6.1 정책
- 스키마 버전은 정수 증가
- 마이그레이션 함수는 `(from, to)` 단방향 목록 관리

## 6.2 실패 처리
- 마이그레이션 중 예외 발생 시:
  1. 기존 DB 유지
  2. 읽기전용 안전모드 전환
  3. 사용자에게 export 가이드 제시

## 7. 백업/복구
## 7.1 Export
- 단일 JSON 파일 생성
- 필수 필드:
  - `backup_format_version`
  - `exported_at`
  - `app_version`
  - `stores`

## 7.2 Import
- 모드:
  - `merge`: 기존 데이터 유지 + 신규 병합
  - `replace`: 전체 교체
- import 전 스키마 검증 필수

## 8. 데이터 무결성
- 저장 전 `zod` validation
- 기록마다 `updatedAt` 강제
- 중요한 데이터는 쓰기 후 읽기 검증(optional)

## 9. 쿼터/예외 처리
- `QuotaExceededError` 감지 시:
  - 오래된 snapshot 정리
  - 사용자에게 용량 알림
- IndexedDB 미지원 환경 fallback:
  - localStorage 축소 모드

## 10. 개인정보/보안
- 로컬 데이터 암호화는 기본 미적용
- 민감정보 저장 금지 정책 준수
- 공유 payload 생성 시 PII 제외

## 11. 테스트
- CRUD 저장/조회 테스트
- 마이그레이션 forward 테스트
- export/import round-trip 테스트
- 손상 데이터 복구 테스트

## 12. DoD
- 데이터 손실 없이 새로고침/재실행 복원
- import/export 실사용 가능 수준
- 스키마 업데이트 대응 체계 확보
