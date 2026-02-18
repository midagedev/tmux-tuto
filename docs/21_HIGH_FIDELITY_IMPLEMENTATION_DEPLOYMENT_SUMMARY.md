# High-Fidelity Simulator Implementation + Deployment Summary

## 1. 문서 목적
- 현재까지 구현된 HF 시뮬레이터 범위, 검증 결과, 배포 방식, 서비스 도메인을 한 문서로 통합한다.
- 기능 변경/운영 점검 시 이 문서를 운영 스냅샷(SSOT)으로 사용한다.

## 2. 기준 시점
- 기준 일시: 2026-02-18
- 기준 브랜치/커밋: `main` / `631ca3e`
- 기준 스펙:
  - `/Users/hckim/repo/tmux-tuto/docs/specs/12_HIGH_FIDELITY_SHELL_TMUX_SIMULATOR_SPEC.md`
  - `/Users/hckim/repo/tmux-tuto/docs/specs/13_CURRICULUM_SIMULATOR_COVERAGE_SPEC.md`

## 3. 구현 완료 범위 (HF-000 ~ HF-072)

### 3.1 Shell + tmux core
- 터미널 버퍼/뷰포트/스크롤백 엔진 (`HF-010`)
- 입력 라인 에디터 및 히스토리/프롬프트 (`HF-011~012`)
- pseudo shell command set (`HF-013`)
- scenario 파일시스템 템플릿 (`HF-014`)
- pane/window/session 그래프/레이아웃 (`HF-020`)
- prefix/key table/command-mode/copy-mode 고도화 (`HF-022~024`)
- `.tmux.conf` 파서/적용 (`HF-025`)

### 3.2 Practice UX
- 터미널 스킨/상태바/오버레이 (`HF-030`, `HF-032`)
- pane 렌더링 분리/active 표시/geometry 표시 (`HF-031`)
- 클릭 포커스/휠 스크롤/키보드 접근성 (`HF-021`, `HF-033`)

### 3.3 Curriculum 연동
- scenario preset 엔진 (`HF-040`)
- mission grading adapter/hint 연동 (`HF-041`, `HF-042`)
- coverage matrix 및 누락 검증 스크립트 (`HF-043`)
- cheatsheet quick practice, bookmark snapshot deep-link (`HF-044`, `HF-045`)

### 3.4 Persistence/Recovery
- IndexedDB snapshot v2 저장/복원 (`HF-050`)
- backup import/export v2 (`HF-051`)
- recovery fallback flow (`HF-052`)

### 3.5 품질/릴리즈
- unit/integration/e2e/benchmark 확장 (`HF-060~063`)
- 문서/CI/릴리즈 게이트 완료 (`HF-070~072`)

## 4. 검증 결과 요약
- 로컬 품질 게이트(2026-02-18):
  - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e:smoke`
  - `pnpm verify:kpi-routes`, `pnpm verify:coverage-matrix`
  - `pnpm benchmark:simulator`, `pnpm build`
  - 결과: 모두 통과
- 원격 GitHub Actions(2026-02-18):
  - `CI`: run `22124361959` success
  - `Deploy GitHub Pages`: run `22124361948` success
  - `Deploy Cloudflare Pages`: run `22124361944` success

## 5. 배포 방식 (현재 운영)

### 5.1 배포 채널
- GitHub Pages
  - workflow: `/Users/hckim/repo/tmux-tuto/.github/workflows/deploy-github-pages.yml`
  - build command: `npm run build:gh` (`VITE_BASE_PATH=/tmux-tuto/`)
- Cloudflare Pages
  - workflow: `/Users/hckim/repo/tmux-tuto/.github/workflows/deploy-cloudflare-pages.yml`
  - build command: `npm run build:cf` (`VITE_BASE_PATH=/`)
  - 필요 권한: `permissions.deployments: write`

### 5.2 필수 설정 값
- GitHub Secrets
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- GitHub Variables
  - `CLOUDFLARE_PAGES_PROJECT_NAME=tmux-tuto`
  - `CLOUDFLARE_PAGES_URL=https://tmux-tuto.pages.dev`

## 6. 서비스 도메인
- 운영 기본 도메인: `https://tmux.midagedev.com`
- Cloudflare Pages 기본 도메인: `https://tmux-tuto.pages.dev`
- GitHub Pages 백업 도메인: `https://midagedev.github.io/tmux-tuto/`

## 7. 도메인/라우팅 상태
- `https://tmux.midagedev.com/practice` -> `tmux Simulator` 렌더링 확인
- `https://midagedev.github.io/tmux-tuto/practice` -> `tmux Simulator` 렌더링 확인
- Deep-link 요청은 정적 SPA fallback 특성상 네트워크에서 `404`가 보일 수 있으나, 렌더가 정상이면 허용한다.
- Cloudflare Pages custom domain API 상태는 전파 타이밍에 따라 `pending`으로 보일 수 있다.

## 8. 최근 운영 안정화 변경
- `d775b5a`: service worker 캐시 버저닝/구버전 캐시 정리/네비게이션 network-first 적용
- `d2edc8b`: 404 fallback `?p=` 복구 시 라우터 bootstrap 순서 수정(딥링크 홈 고정 이슈 해결)
- `631ca3e`: Cloudflare deployment workflow에 `deployments: write` 권한 추가

## 9. 연계 문서
- 상세 작업 로그: `/Users/hckim/repo/tmux-tuto/docs/14_HIGH_FIDELITY_SIMULATOR_TODOLIST.md`
- 사용자 사용법: `/Users/hckim/repo/tmux-tuto/docs/19_HIGH_FIDELITY_SIMULATOR_USER_GUIDE.md`
- 릴리즈 체크: `/Users/hckim/repo/tmux-tuto/docs/20_HIGH_FIDELITY_RELEASE_CHECKLIST.md`
- 최종 게이트: `/Users/hckim/repo/tmux-tuto/docs/FINAL_GATE_REPORT.md`
- 운영 절차: `/Users/hckim/repo/tmux-tuto/docs/RELEASE_RUNBOOK.md`
