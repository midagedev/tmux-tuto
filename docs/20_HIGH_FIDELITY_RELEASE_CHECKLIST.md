# High-Fidelity Simulator Release Checklist

## 기준
- 대상 범위: `HF-000` ~ `HF-072`
- 기준 문서:
  - `/Users/hckim/repo/tmux-tuto/docs/specs/12_HIGH_FIDELITY_SHELL_TMUX_SIMULATOR_SPEC.md`
  - `/Users/hckim/repo/tmux-tuto/docs/specs/13_CURRICULUM_SIMULATOR_COVERAGE_SPEC.md`

## 1. 기능 완료 체크
- [x] Shell simulator core (`HF-010~014`)
- [x] tmux high-fidelity core (`HF-020~025`)
- [x] Practice UX/접근성 (`HF-030~033`)
- [x] Curriculum 연동 (`HF-040~045`)
- [x] 저장/복구 (`HF-050~052`)
- [x] 테스트/품질 (`HF-060~063`)
- [x] 문서/CI 릴리즈 준비 (`HF-070~071`)

## 2. 자동 게이트 체크 (2026-02-18)
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm test:e2e:smoke`
- [x] `pnpm verify:kpi-routes`
- [x] `pnpm verify:coverage-matrix`
- [x] `pnpm benchmark:simulator`
- [x] `pnpm build`

### 2.1 Issue #14 게이트 재검증 (2026-02-18)
- [x] `npm run test`
- [x] `npm run test:e2e:smoke`
- [x] `npm run verify:coverage-matrix`
- [x] 결과 문서 갱신: `/Users/hckim/repo/tmux-tuto/docs/FINAL_GATE_REPORT.md`

## 3. 수동 점검 체크
- [x] Practice 주요 조작 흐름 (split/focus/resize/copy/config apply)
- [x] Cheatsheet/Bookmarks/Recovery 재진입 흐름
- [x] 문서 기대치/제약 명시 (`19_HIGH_FIDELITY_SIMULATOR_USER_GUIDE.md`)
- [x] 원격 GitHub Actions 실행 결과 확인
  - CI: `22124361959` success
  - Deploy GitHub Pages: `22124361948` success
  - Deploy Cloudflare Pages: `22124361944` success
- [x] 실제 배포 환경 smoke 확인
  - GitHub Pages: `https://midagedev.github.io/tmux-tuto/practice`
  - Cloudflare custom domain: `https://tmux.midagedev.com/practice`
  - Deep-link 요청 자체의 `404` 응답은 SPA fallback 동작으로 허용

## 4. 승인 판정
- 현재 판정: **최종 승인 (배포 운영 가능)**
- 승인 근거:
  1. 로컬 게이트(lint/type/test/e2e/build/verify/benchmark) 통과
  2. 원격 CI/배포 워크플로우 통과
  3. 운영 도메인 실접속 smoke 확인
