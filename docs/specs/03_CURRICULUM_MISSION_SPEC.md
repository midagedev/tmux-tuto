# 스펙: 커리큘럼/미션/채점

## 1. 목표
- 학습자가 단계적으로 tmux 조작을 익히도록 커리큘럼을 제공한다.
- 미션 제출 시 로컬 채점으로 즉시 피드백을 제공한다.
- 실무 전이를 위해 권장 설정과 원격 운영 플레이북을 필수 콘텐츠로 포함한다.

## 2. 커리큘럼 계층
- `Track`
- `Chapter`
- `Lesson`
- `Mission`
- `Playbook` (실무 절차형 가이드)

## 3. 콘텐츠 스키마
## 3.1 Track
```json
{
  "id": "track-foundations",
  "title": "Foundations",
  "order": 1,
  "prerequisites": []
}
```

## 3.2 Lesson
```json
{
  "id": "lesson-pane-split",
  "trackId": "track-foundations",
  "chapterId": "chapter-pane-basics",
  "title": "Pane Split Basics",
  "objectives": ["수직 분할", "수평 분할"],
  "estimatedMinutes": 8
}
```

## 3.3 Mission
```json
{
  "id": "mission-split-2x2",
  "lessonId": "lesson-pane-split",
  "type": "state-check",
  "initialScenario": "single-pane",
  "passRules": [
    {"kind": "paneCount", "operator": ">=", "value": 4},
    {"kind": "layout", "operator": "equals", "value": "grid"}
  ],
  "hints": ["분할 키를 먼저 확인하세요", "활성 pane 이동 후 다시 분할하세요"]
}
```

## 3.4 Playbook
```json
{
  "id": "playbook-recommended-config",
  "title": "권장 tmux.conf 베이스",
  "category": "config",
  "estimatedMinutes": 7,
  "prerequisites": ["track-foundations"],
  "steps": [
    {"id": "p1", "title": "기본 설정 복사"},
    {"id": "p2", "title": "tmux 설정 리로드"},
    {"id": "p3", "title": "핵심 동작 확인"}
  ],
  "verification": [
    "mouse on 동작 확인",
    "base-index 1 확인",
    "reload shortcut 확인"
  ]
}
```

## 4. 채점 룰 엔진
## 4.1 Rule 종류
- `paneCount`
- `windowCount`
- `activePanePosition`
- `layout`
- `modeIs`
- `commandUsed`

## 4.2 Rule 평가 알고리즘
1. 미션 passRules 순회
2. 각 rule에 대해 현재 `SimState` 파생값 계산
3. 불일치 rule 수집
4. 결과 생성:
  - `status: pass | fail`
  - `failedRules[]`
  - `hintLevel`별 피드백

## 4.3 결정성 요구
- rule 입력과 state가 동일하면 결과가 항상 동일해야 한다.

## 5. 힌트 시스템
- 1단계: 개념 힌트
- 2단계: 액션 힌트
- 3단계: 정답 경로 요약
- 힌트 사용 횟수는 XP 계산에 반영

## 6. 점수/진행도
## 6.1 XP 계산
- 기본 XP + 난이도 보정 + 재시도 패널티 + 힌트 패널티
- 최소 XP 0

## 6.2 스트릭
- 하루 1개 이상 미션 pass 시 스트릭 +1
- 사용자 로컬 타임존 기준

## 6.3 업적
- 예:
  - `first_pass`
  - `copy_mode_master`
  - `7day_streak`

## 7. 콘텐츠 버전 관리
- `content_version` 필드 필수
- 앱 시작 시 현재 버전과 로컬 버전 비교
- 변화가 있으면 migration rule 적용:
  - 삭제된 미션 -> archived 처리
  - 변경된 미션 -> 점수 재계산 옵션 제공

## 8. 저작 워크플로
1. JSON 작성
2. `zod/json schema` validator 통과
3. 로컬 샘플 시나리오로 미션 채점 테스트
4. PR 리뷰 후 배포

## 9. UI 규칙
- 레슨 페이지에 목표/성공 조건 고정
- 미션 실패 시 "실패 rule"을 명시적으로 출력
- 미션 완료 시 공유 진입 CTA 표시
- 플레이북 페이지에는 `준비사항`, `복사 명령`, `검증 체크리스트`를 고정 노출

## 10. 테스트
- 룰 타입별 유닛 테스트
- 복합 룰 미션 테스트
- 난이도별 XP 계산 테스트
- 콘텐츠 migration 회귀 테스트
- 플레이북 링크/명령 블록 복사 동작 테스트

## 11. DoD
- Track A~C 기본 미션 세트 제공
- 미션 채점/힌트/XP/업적 동작 확인
- 콘텐츠 버전 변경 시 진행도 손상 없이 동작
- 실무 플레이북 3종 기본 탑재:
  - 권장 tmux.conf
  - tmux 세션 유지 루틴
  - Tailscale SSH 원격 접속 루틴

## 12. 필수 실무 플레이북 범위
- 플레이북은 다음 3종을 필수 제공한다:
  - 권장 `tmux.conf` 베이스
  - tmux 세션 유지 루틴
  - Tailscale SSH 원격 작업 루틴
- 플레이북 콘텐츠 상세(명령/검증/트러블슈팅)의 정본은 아래 문서를 따른다:
  - `/Users/hckim/repo/tmux-tuto/docs/specs/11_PRACTICAL_PLAYBOOKS_SPEC.md`
