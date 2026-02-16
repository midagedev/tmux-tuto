# 문서 정렬 리포트 (2026-02-16)

## 1. 점검 범위
- `/Users/hckim/repo/tmux-tuto/docs/README.md`
- `/Users/hckim/repo/tmux-tuto/docs/00_EXECUTION_TODOLIST.md`
- `/Users/hckim/repo/tmux-tuto/docs/specs/*.md`

## 2. 해결한 불일치
1. 라우트 파라미터 네이밍 불일치
- 조치:
  - `playbookId` -> `playbookSlug` 통일
  - `:track/:chapter/:lesson` -> `:trackSlug/:chapterSlug/:lessonSlug` 통일

2. 온보딩 라우트 누락
- 조치:
  - 아키텍처/분석 스펙에 `/onboarding/*` 라우트 반영
  - 온보딩 KPI 경로를 분석 스펙과 동기화

3. 릴리즈 범위 혼선
- 조치:
  - v1 범위를 Track A~C로 고정
  - Track D/E는 preview로만 노출하도록 명시

4. 플레이북 중복 정의 리스크
- 조치:
  - 플레이북 상세 정본을 `/Users/hckim/repo/tmux-tuto/docs/specs/11_PRACTICAL_PLAYBOOKS_SPEC.md`로 일원화
  - 커리큘럼 스펙은 범위/연결 책임 중심으로 축소

## 3. 새로 추가한 기준 문서
- `/Users/hckim/repo/tmux-tuto/docs/01_PROJECT_CONVENTIONS.md`
  - 라우트/식별자/분석/문서 변경 규약을 단일 Source of Truth로 정의

## 4. Todo 재정렬 결과
- `/Users/hckim/repo/tmux-tuto/docs/00_EXECUTION_TODOLIST.md`를 PR 단위(`E-000`~`E-076`)로 재작성
- 단계형(Phase 0~7) + 선후관계 + 병렬 가능/금지 작업 + 단계 게이트 포함

## 5. 현재 상태 결론
- 문서 간 핵심 충돌은 해소됨
- 구현 착수 기준(범위/라우트/순서/품질게이트)이 명확함
- 다음 작업은 `E-010`부터 순차 착수 가능
