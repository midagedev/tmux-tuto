# QA 튜닝 리포트 (E-072)

## 1. 브라우저 호환성
- 클립보드 API 미지원 환경 fallback 추가:
  - `src/utils/clipboard.ts`
  - 지원 시 `navigator.clipboard.writeText`
  - 미지원 시 `window.prompt` fallback

## 2. 접근성 개선
- 스킵 링크 추가:
  - `src/app/layout/AppShell.tsx`
  - `#main-content`로 키보드 이동 지원
- 포커스 가시성 강화:
  - `src/index.css`의 `:focus-visible` 스타일
- 상태 메시지 보강:
  - 복사 성공/실패 문구 `role="status"` + `aria-live="polite"`

## 3. 성능 개선
- 라우트 단위 lazy loading 적용:
  - `src/app/router.tsx`
- 콘텐츠 JSON 동적 import로 초기 번들 분리:
  - `src/features/curriculum/contentLoader.ts`

## 4. 검증
- `npm run lint`
- `npm run test`
- `npm run test:e2e:smoke`
- `npm run build`
