# 스펙: Cheatsheet / Bookmark / Notes

## 1. 목표
- 기억이 안 나는 tmux 단축키를 즉시 찾고, 바로 실습으로 전환 가능해야 한다.
- 자주 쓰는 기능은 북마크/노트로 개인화해 반복 학습이 가능해야 한다.
- 실무형 질의(`tmux.conf`, `세션 유지`, `원격 SSH`)도 검색 즉시 해결 가능해야 한다.

## 2. Cheatsheet 데이터 모델
## 2.1 필수 필드
- `id`
- `title`
- `contentType` (`shortcut` | `command` | `playbook`)
- `intentTags` (예: `split`, `session`, `copy-mode`)
- `shortcut` (예: `prefix + %`)
- `description`
- `examples[]`
- `relatedActions[]` (시뮬레이터 액션 ID)
- `difficulty`

## 2.2 검색 인덱스
- 인메모리 토큰 인덱스 생성
- 색인 대상:
  - title
  - intentTags
  - description
  - synonyms

## 3. 검색 UX
- 검색 입력 즉시 결과 표시 (debounce 100ms 이하)
- 결과 카드에는 다음 정보 표시:
  - 단축키
  - 한 줄 설명
  - 관련 상황
  - "바로 실습" 버튼
  - `playbook` 타입일 경우 "가이드 열기"와 "명령 복사" 버튼

## 4. 검색 정렬 규칙
1. 정확한 단축키 매치 우선
2. intent tag 매치
3. title 유사도
4. 최근 조회한 항목 가중치

## 5. 바로 실습(Quick Practice)
- 결과 카드에서 클릭 시:
  1. `/practice` 이동
  2. 관련 시뮬레이터 상태 preset 적용
  3. 우측 패널에 액션 가이드 표시
- `playbook` 타입은 `/playbooks/:playbookSlug`로 이동 후 필요 시 `/practice` 연계

## 6. 북마크 기능
## 6.1 북마크 타입
- `lesson`
- `mission`
- `cheatsheet_item`
- `action_pattern`
- `playbook`

## 6.2 북마크 필드
- `id`, `type`, `targetId`, `title`, `tags[]`, `createdAt`, `updatedAt`

## 6.3 동작
- 생성/수정/삭제
- 태그 필터
- 생성일/최근사용 정렬

## 7. 노트 기능
- 북마크마다 개인 메모 첨부 가능
- markdown-lite 지원(굵게, 코드, 리스트)
- 길이 제한(예: 2,000 chars)

## 8. 데이터 저장
- `bookmarks` store
- `notes` store
- recent search query는 `localStorage` 보관

## 9. 에러 처리
- 저장 실패 시 즉시 재시도
- 2회 실패 시 JSON export 권장 메시지
- 삭제는 undo(5초) 지원

## 10. 접근성
- 검색/결과 리스트 키보드 탐색 지원
- 북마크 버튼 aria-label 지정
- 고대비 모드에서 단축키 카드 가독성 유지

## 11. 분석(라우트 기반)
- 검색 행동은 전용 라우트로 치환:
  - `/cheatsheet/search/:queryKey`
- 바로 실습 전환:
  - `/practice/from-cheatsheet/:itemId`
- 북마크 진입:
  - `/bookmarks/:bookmarkId`
- 플레이북 진입:
  - `/playbooks/:playbookSlug`

## 11.1 필수 플레이북 검색 태그
- `tmux.conf`
- `persistent-session`
- `detach-attach`
- `tailscale`
- `remote-ssh`
- `secure-remote`

## 12. 테스트
- 검색 정확도 스냅샷 테스트
- 태그 필터/정렬 테스트
- 바로 실습 preset 적용 테스트
- 북마크/노트 CRUD 테스트
- 플레이북 검색/열기/복사 버튼 테스트

## 13. DoD
- 검색 -> 실습 전환 흐름 완성
- 북마크/노트 영속 저장 검증
- 자주 찾는 항목을 5초 내 재접근 가능
- 실무 플레이북 3종이 치트시트 검색 결과 상위 노출
