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

## 3. 수동 점검 체크
- [x] Practice 주요 조작 흐름 (split/focus/resize/copy/config apply)
- [x] Cheatsheet/Bookmarks/Recovery 재진입 흐름
- [x] 문서 기대치/제약 명시 (`19_HIGH_FIDELITY_SIMULATOR_USER_GUIDE.md`)
- [ ] 원격 GitHub Actions 실행 결과 확인
- [ ] 실제 배포 환경(GitHub Pages/Cloudflare Pages) smoke 확인

## 4. 승인 판정
- 현재 판정: **조건부 승인(로컬 게이트 완료)**
- 남은 승인 조건:
  1. 원격 CI 파이프라인 통과 확인
  2. 배포 대상 URL smoke 확인
