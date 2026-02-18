# A2 업적 목록 정리안 v1 (Core/Fun)

- 기준 코드: `src/features/progress/achievementCatalog.ts`, `src/features/progress/progressEngine.ts`
- 작성일: 2026-02-18
- 목표: 업적 12~18개, Core 60~70% / Fun 30~40%

## 1) 현재 업적 인벤토리 (23개)

| 분류 | 개수 | 항목 |
| --- | --- | --- |
| Course | 6 | `first_mission_passed`, `streak_7_days`, `track_a_completed`, `track_b_completed`, `track_c_completed`, `full_curriculum_completed` |
| Skill | 17 | `skill_first_split`, `skill_triple_panes`, `skill_split_20`, `skill_split_100`, `skill_first_window`, `skill_first_session`, `skill_first_copy_mode`, `skill_layout_first`, `skill_zoom_control`, `skill_sync_control`, `skill_command_prompt`, `skill_choose_tree`, `skill_resize_5`, `skill_pane_navigator`, `skill_swap_first`, `skill_rotate_first`, `skill_three_lessons` |

주요 문제
- 의미가 유사한 입문 업적이 분산(`first_session/window/split`)되어 이해 비용이 높다.
- 조작 단위 업적이 많아 학습 경로 이수 대비 시그널이 약하다.
- 반복형은 `20/100` 두 단계만 있어 중간 동기 설계가 부족하다.

## 2) v1 목표 카탈로그 (15개)

- 총 15개
- Core 10개 (66.7%)
- Fun 5개 (33.3%)

| v1 ID | 태그 | 의도 | 해금 조건 초안 | 상태 |
| --- | --- | --- | --- | --- |
| `first_mission_passed` | Core | 첫 성공 경험 강화 | `completedMissionCount >= 1` | 유지 |
| `workspace_bootstrap` | Core | 세션/윈도우/분할 기본기 통합 | `newSessionCount >= 1` AND `newWindowCount >= 1` AND `splitCount >= 1` | 통합(신규 ID) |
| `copy_mode_starter` | Core | copy-mode 입문 고정 | `copyModeCount >= 1` | 통합(`skill_first_copy_mode`) |
| `command_flow_starter` | Core | 명령 기반 제어 입문 | `commandPromptCount >= 1` OR `chooseTreeCount >= 1` | 통합(`skill_command_prompt`, `skill_choose_tree`) |
| `track_a_completed` | Core | 기초 트랙 완주 | `completedTrackSlugs`에 track A 포함 | 유지 |
| `track_b_completed` | Core | 워크플로우 트랙 완주 | `completedTrackSlugs`에 track B 포함 | 유지 |
| `track_c_completed` | Core | 심화 트랙 완주 | `completedTrackSlugs`에 track C 포함 | 유지 |
| `full_curriculum_completed` | Core | 전체 완주 | A/B/C 완료 | 유지 |
| `streak_7_days` | Core | 학습 일관성 강화 | `streakDays >= 7` | 유지 |
| `lesson_explorer` | Core | 다양한 레슨 탐색 유도 | `lessonCount >= 3` | 통합(`skill_three_lessons`) |
| `pane_runner_30` | Fun | 적당한 반복 습관 형성 | `splitCount >= 30` | 조정(`skill_split_20`) |
| `pane_hundred` | Fun | 장기 반복 목표 | `splitCount >= 100` | 유지(`skill_split_100`) |
| `layout_alchemist` | Fun | 레이아웃 실험 장려 | `layoutSelectCount >= 1` OR `uniqueLayoutCount >= 3` | 확장(`skill_layout_first`) |
| `focus_navigator` | Fun | 패인 이동 숙련 유도 | `paneSelectCount >= 12` OR `paneResizeCount >= 8` | 통합(`skill_pane_navigator`, `skill_resize_5`) |
| `hidden_trickster` | Fun | 탐색형 숨은 업적 | `commandPromptCount >= 1` AND `chooseTreeCount >= 1` | 신규 |

## 3) 유지/통합/삭제 매핑

| 기존 ID | 조치 | v1 반영 |
| --- | --- | --- |
| `first_mission_passed` | 유지 | `first_mission_passed` |
| `streak_7_days` | 유지 | `streak_7_days` |
| `track_a_completed` | 유지 | `track_a_completed` |
| `track_b_completed` | 유지 | `track_b_completed` |
| `track_c_completed` | 유지 | `track_c_completed` |
| `full_curriculum_completed` | 유지 | `full_curriculum_completed` |
| `skill_first_session` | 통합 | `workspace_bootstrap` |
| `skill_first_window` | 통합 | `workspace_bootstrap` |
| `skill_first_split` | 통합 | `workspace_bootstrap` |
| `skill_first_copy_mode` | 통합 | `copy_mode_starter` |
| `skill_command_prompt` | 통합 | `command_flow_starter` |
| `skill_choose_tree` | 통합 | `command_flow_starter`, `hidden_trickster` |
| `skill_three_lessons` | 유지(이름 변경) | `lesson_explorer` |
| `skill_split_20` | 임계치 조정 | `pane_runner_30` |
| `skill_split_100` | 유지(이름 변경) | `pane_hundred` |
| `skill_layout_first` | 확장 | `layout_alchemist` |
| `skill_pane_navigator` | 통합 | `focus_navigator` |
| `skill_resize_5` | 통합 | `focus_navigator` |
| `skill_triple_panes` | 삭제 | `workspace_bootstrap`에 흡수 |
| `skill_zoom_control` | 삭제 | 유지 가치 낮아 제외 |
| `skill_sync_control` | 삭제 | 사용 빈도 낮고 학습 필수성 낮음 |
| `skill_swap_first` | 삭제 | 학습 필수 경로와 거리 큼 |
| `skill_rotate_first` | 삭제 | 학습 필수 경로와 거리 큼 |

## 4) 구현 가이드 (이슈 #10 입력)

- 카탈로그 ID는 v1 ID를 기준으로 재생성한다.
- evaluator는 기존 통계 필드를 재사용하고, 추가 저장 스키마 변경 없이 계산식만 교체한다.
- 숨은 업적(`hidden_trickster`)은 Progress에서 설명을 부분 공개(예: "명령 조합을 시도해 보세요")로 노출한다.

## 5) 완료 기준 점검

- 업적 수량 목표(12~18): 충족 (15개)
- Core/Fun 비율: 충족 (66.7% / 33.3%)
- 모든 업적 해금 조건 초안: 충족
- 중복 의미 업적 정리 방향: 충족 (유지/통합/삭제 표 제공)
