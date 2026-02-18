# A4 완료 피드백 UI 요구사항 시트

- 기준 이슈: #6
- 작성일: 2026-02-18
- 적용 대상: `src/pages/Practice/PracticeVmPocPage.tsx` 및 공통 UI 컴포넌트

## 1) 목표

- 미션 완료, 레슨 완료, 업적 해금을 사용자에게 즉시 인지시킨다.
- 상태별 메시지/CTA는 다르지만 인터랙션 규칙은 동일하게 유지한다.
- 다중 업적 동시 해금에서도 누락 없이 순차 노출한다.

## 2) 상태별 UI 정의

| 상태 | 트리거 | 제목 규칙 | 조건 요약 규칙 | 기본 CTA |
| --- | --- | --- | --- | --- |
| Mission Complete | 선택 미션 `pass=true`로 전환 | "미션 완료" + 미션 제목 | 어떤 규칙이 충족됐는지 1줄 요약 | 다음 미션 이동 |
| Lesson Complete | 해당 레슨의 모든 미션 완료 | "레슨 완료" + 레슨 제목 | 완료한 미션 수/총 미션 수 | 다음 레슨 이동 |
| Achievement Unlocked | 신규 업적 ID 해금 | 업적 제목 | 해금 조건 요약 1줄 | 진행도 보기 + 공유 |

## 3) 공통 컴포넌트 계약

```ts
// CompletionFeedbackCard props 계약
interface CompletionFeedbackCardProps {
  kind: 'mission' | 'lesson' | 'achievement';
  title: string;
  summary: string;
  primaryCta: { label: string; action: 'next-mission' | 'next-lesson' | 'open-progress' | 'share' };
  secondaryCta?: { label: string; action: 'dismiss' | 'open-progress' | 'share' };
  achievementId?: string;
  queueIndex?: number;
  queueTotal?: number;
  onAction: (action: CompletionFeedbackCardProps['primaryCta']['action']) => void;
  onDismiss: () => void;
}
```

상태 모델

```ts
interface CompletionFeedbackState {
  active: CompletionFeedbackCardProps | null;
  queue: CompletionFeedbackCardProps[];
  seenKeys: string[]; // session 내 중복 방지 키
  lastDismissedAt: number | null;
}
```

중복 방지 키 규칙
- mission: `mission:{missionSlug}`
- lesson: `lesson:{lessonSlug}`
- achievement: `achievement:{achievementId}`

## 4) 큐 처리 정책

- 우선순위: `mission > lesson > achievement`
- 동시에 여러 업적이 열릴 경우 `achievement` 이벤트를 큐에 순서대로 적재
- `active`가 닫히면 다음 큐를 즉시 노출
- 동일 `seenKey`는 재적재 금지
- 세션 재진입 시 큐는 비우고, 이미 해금된 업적은 다시 토스트하지 않음

## 5) 상태 전이 플로우

| 현재 상태 | 이벤트 | 다음 상태 |
| --- | --- | --- |
| idle | missionComplete | mission card active |
| mission active | lessonComplete 동시 발생 | lesson card queue enqueue |
| mission active | achievementUnlocked N개 | achievement N개 queue enqueue |
| active card | dismiss | queue head를 active로 승격 |
| queue empty | dismiss | idle |

## 6) 모바일 요구사항

- 기본 위치: 하단 sheet 스타일(모바일), 우상단 카드(데스크톱)
- 작은 화면(`<= 480px`)에서 CTA 버튼은 세로 정렬
- 가상 키보드 노출 시 카드가 입력 영역을 가리지 않도록 `bottom` offset 적용

## 7) 접근성 요구사항

- 상태 알림 영역에 `aria-live="polite"` 적용
- 카드 루트에 `role="dialog"`, `aria-modal="true"` 적용
- 키보드 조작
- `Tab`으로 CTA 순회 가능
- `Escape`로 닫기 가능
- 닫은 뒤 포커스는 이전 활성 버튼으로 복귀

## 8) 구현 수용 기준 (이슈 #13 입력)

- 미션/레슨/업적 3종 카드가 시각적으로 구분된다.
- 다중 업적 해금 시 순차 노출이 보장된다.
- dismiss 후 중복 재노출이 발생하지 않는다.
- 모바일에서 CTA가 가려지지 않는다.
- 키보드만으로 이동/닫기/CTA 실행이 가능하다.
