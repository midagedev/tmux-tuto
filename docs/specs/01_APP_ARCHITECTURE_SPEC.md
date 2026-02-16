# 스펙: 앱 아키텍처 (Static SPA)

## 1. 범위
- 정적 SPA 기반 앱 셸, 라우팅, UI 프레임, 공통 상태, 배포 설정.
- 백엔드 없는 실행 구조를 전제로 한다.

## 2. 기술 스택
- `React 18+`, `TypeScript`
- 번들러: `Vite`
- 라우팅: `react-router-dom`
- 상태관리: `zustand`
- 터미널 렌더링: `xterm.js`
- 데이터 검증: `zod`
- 테스트: `vitest`, `playwright`

## 3. 디렉토리 구조
```txt
src/
  app/
    router.tsx
    layout/
  pages/
    Learn/
    Practice/
    Cheatsheet/
    Progress/
    Bookmarks/
    Share/
  features/
    simulator/
    curriculum/
    grading/
    storage/
    analytics/
    sharing/
  components/
  content/
  styles/
```

## 4. 라우트 명세
- `/` -> 대시보드/학습 진입
- `/learn` -> 트랙 목록
- `/learn/:trackSlug/:chapterSlug/:lessonSlug`
- `/practice`
- `/cheatsheet`
- `/playbooks`
- `/playbooks/:playbookSlug`
- `/bookmarks`
- `/progress`
- `/onboarding/start`
- `/onboarding/goal`
- `/onboarding/preferences`
- `/onboarding/first-mission`
- `/onboarding/first-mission/passed` (분석용 라우트)
- `/onboarding/done`
- `/progress/missions/:missionSlug/passed` (분석용 라우트)
- `/share/:milestoneSlug`
- `*` -> 404 + 홈 이동

### 파라미터 네이밍 규칙
- URL 파라미터는 `Slug` 접미사를 사용한다.
- 예: `:playbookSlug`, `:missionSlug`

## 5. 앱 셸 UX 규칙
- 좌측: 네비게이션 및 현재 트랙 컨텍스트
- 중앙: 페이지 컨텐츠(Practice에서는 시뮬레이터)
- 우측: 상황별 패널(목표, 힌트, 단축키, 최근 북마크)

## 6. 공통 상태 규약
- 앱 전역 상태는 도메인별 store로 분리:
  - `uiStore`
  - `simulatorStore`
  - `curriculumStore`
  - `progressStore`
- 컴포넌트는 selector 기반 구독만 허용 (전체 store 구독 금지).

## 7. 에러/복구 UX
- 치명적 에러: 전체 fallback 화면 + "로컬 데이터 복구 시도"
- 페이지 단위 에러: 섹션 fallback + 재시도 버튼
- 저장 실패: 토스트 + 진단 코드 + 백업 다운로드 유도

## 8. PWA/오프라인
- `service-worker`는 다음 자산 캐시:
  - 앱 셸 JS/CSS
  - 핵심 콘텐츠 JSON
  - 기본 OG 이미지
- 캐시 정책:
  - 정적 자산: cache-first
  - 콘텐츠 JSON: stale-while-revalidate

## 9. 배포 스펙
## 9.1 GitHub Pages
- 빌드 결과 `dist/`
- 베이스 경로 환경변수 `VITE_BASE_PATH`
- SPA fallback용 `404.html` 포함

## 9.2 Cloudflare Pages
- 빌드 명령: `npm run build`
- 출력 디렉토리: `dist`
- `_headers`로 CSP 등 보안 헤더 설정
- `_redirects`로 SPA fallback 설정

## 10. 보안 헤더 (정적)
- `Content-Security-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`

## 11. 성능 예산
- 초기 JS <= 220KB gzip 목표
- 초기 렌더 <= 2.5s p95
- Practice 페이지 진입 전 xterm lazy load

## 12. 테스트 포인트
- 라우팅 전환/새로고침 안정성
- base path 변경 시 자산 경로 정상
- 오프라인에서 최근 방문 페이지 렌더 가능

## 13. DoD
- 라우트/앱 셸/PWA/배포 설정 완성
- GitHub Pages + Cloudflare Pages 모두 동일 동작
- 최소 브라우저 4종 수동 확인 완료
