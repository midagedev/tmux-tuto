export type AchievementCategory = 'core' | 'fun';

export type AchievementDefinition = {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  shareText: string;
};

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_mission_passed',
    category: 'core',
    title: '첫 미션 완료',
    description: '첫 실습 미션을 통과했습니다.',
    shareText: '첫 미션을 통과했어요.',
  },
  {
    id: 'workspace_bootstrap',
    category: 'core',
    title: '워크스페이스 부트스트랩',
    description: '세션/윈도우/분할 기본기를 한 번에 완성했습니다.',
    shareText: '세션/윈도우/분할 기본 루틴을 완성했어요.',
  },
  {
    id: 'copy_mode_starter',
    category: 'core',
    title: 'Copy 모드 입문',
    description: 'copy-mode를 실행해 로그 탐색 루틴에 진입했습니다.',
    shareText: 'Copy 모드 입문 업적을 달성했어요.',
  },
  {
    id: 'command_flow_starter',
    category: 'core',
    title: '명령 흐름 입문',
    description: 'command-prompt 또는 choose-tree를 실행했습니다.',
    shareText: '명령 흐름 입문 업적을 달성했어요.',
  },
  {
    id: 'track_a_completed',
    category: 'core',
    title: 'Track A 완료',
    description: '기초 트랙 실습을 완료했습니다.',
    shareText: 'Track A를 완료했어요.',
  },
  {
    id: 'track_b_completed',
    category: 'core',
    title: 'Track B 완료',
    description: '워크플로우 트랙 실습을 완료했습니다.',
    shareText: 'Track B를 완료했어요.',
  },
  {
    id: 'track_c_completed',
    category: 'core',
    title: 'Track C 완료',
    description: '심화 트랙 실습을 완료했습니다.',
    shareText: 'Track C를 완료했어요.',
  },
  {
    id: 'full_curriculum_completed',
    category: 'core',
    title: '커리큘럼 완주',
    description: 'Track A~C 전체를 완료했습니다.',
    shareText: '전체 커리큘럼을 완주했어요.',
  },
  {
    id: 'streak_7_days',
    category: 'core',
    title: '7일 스트릭',
    description: '7일 연속 학습을 달성했습니다.',
    shareText: '7일 연속 학습 스트릭을 달성했어요.',
  },
  {
    id: 'lesson_explorer',
    category: 'core',
    title: '레슨 탐험가',
    description: '서로 다른 레슨 3개 이상에서 실습했습니다.',
    shareText: '레슨 탐험가 업적을 달성했어요.',
  },
  {
    id: 'pane_runner_30',
    category: 'fun',
    title: 'Pane 러너',
    description: 'pane 분할 누적 30회를 달성했습니다.',
    shareText: 'Pane 러너 업적을 달성했어요.',
  },
  {
    id: 'pane_hundred',
    category: 'fun',
    title: 'Pane 백장',
    description: 'pane 분할 누적 100회를 달성했습니다.',
    shareText: 'Pane 백장 업적을 달성했어요.',
  },
  {
    id: 'layout_alchemist',
    category: 'fun',
    title: '레이아웃 연금술사',
    description: '레이아웃을 바꾸거나 다양한 레이아웃을 실험했습니다.',
    shareText: '레이아웃 연금술사 업적을 달성했어요.',
  },
  {
    id: 'focus_navigator',
    category: 'fun',
    title: '포커스 네비게이터',
    description: 'pane 이동/리사이즈를 충분히 반복해 포커스 제어 루틴을 만들었습니다.',
    shareText: '포커스 네비게이터 업적을 달성했어요.',
  },
  {
    id: 'hidden_trickster',
    category: 'fun',
    title: '숨은 트릭스터',
    description: 'command-prompt와 choose-tree를 모두 사용했습니다.',
    shareText: '숨은 트릭스터 업적을 달성했어요.',
  },
];

const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export function listAchievementDefinitions(category?: AchievementCategory) {
  if (!category) {
    return ACHIEVEMENTS;
  }

  return ACHIEVEMENTS.filter((achievement) => achievement.category === category);
}

export function getAchievementDefinition(id: string) {
  return ACHIEVEMENT_MAP.get(id) ?? null;
}
