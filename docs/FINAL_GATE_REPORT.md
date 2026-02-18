# 최종 게이트 검증 리포트 (2026-02-18)

## 1. 실행 명령
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e:smoke`
- `pnpm verify:kpi-routes`
- `pnpm verify:coverage-matrix`
- `pnpm benchmark:simulator`
- `pnpm build`

## 2. 결과 요약
- Lint: 통과
- Typecheck: 통과
- Unit/Integration Test: 통과 (23 files, 82 tests)
- E2E Smoke: 통과 (15 tests)
- KPI Route Map Verification: 통과
- Coverage Matrix Verification: 통과 (`missions=9, rows=9, capabilities=14`)
- Simulator Benchmark: 통과
  - Input reaction p95: `0.004ms` (target `< 80ms`)
  - Pane split reaction p95: `0.006ms` (target `< 100ms`)
  - Pane focus reaction p95: `0.002ms` (target `< 100ms`)
  - Pane scroll reaction p95: `0.002ms` (target `< 100ms`)
- Production Build: 통과

## 3. HF 게이트 판정
- `G-HF-01` 시뮬레이터 핵심 조작(split/focus/scroll/copy-mode/command-mode): 통과
- `G-HF-02` 커리큘럼/치트시트/북마크/복구 연동: 통과
- `G-HF-03` snapshot 저장/복원 및 recovery fallback: 통과
- `G-HF-04` 테스트 게이트(unit/integration/e2e): 통과
- `G-HF-05` 성능 기준(p95) 측정 및 명시: 통과
- `G-HF-06` CI 게이트 자동화(lint/type/test/e2e/build + verify): 통과(워크플로 정의 기준)

## 4. 잔여 수동 확인 항목
- Cloudflare Pages custom domain 검증 상태가 `pending -> active`로 최종 전환되는지 확인
- Cloudflare Web Analytics 수집 반영 확인

## 5. 원격 파이프라인 결과 (2026-02-18)
- CI: `22124361959` (success)
- Deploy GitHub Pages: `22124361948` (success)
- Deploy Cloudflare Pages: `22124361944` (success)

## 6. 배포 엔드포인트 상태 (2026-02-18)
- GitHub Pages: `https://midagedev.github.io/tmux-tuto/` (`200`)
- Cloudflare Pages subdomain: `https://tmux-tuto.pages.dev` (운영 경로 확인)
- Cloudflare custom domain: `https://tmux.midagedev.com/` (`200`)
- Practice smoke:
  - `https://midagedev.github.io/tmux-tuto/practice` -> `tmux Simulator` 렌더링 확인
  - `https://tmux.midagedev.com/practice` -> `tmux Simulator` 렌더링 확인
- 참고:
  - SPA deep-link는 정적 호스팅 fallback 특성으로 네트워크 탭에서 `404`가 보일 수 있으나 앱 렌더링이 정상이라면 허용한다.
