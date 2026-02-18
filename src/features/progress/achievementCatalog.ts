export type AchievementCategory = 'course' | 'skill';

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
    category: 'course',
    title: '첫 미션 완료',
    description: '첫 실습 미션을 통과했습니다.',
    shareText: '첫 미션을 통과했어요.',
  },
  {
    id: 'streak_7_days',
    category: 'course',
    title: '7일 스트릭',
    description: '7일 연속 학습을 달성했습니다.',
    shareText: '7일 연속 학습 스트릭을 달성했어요.',
  },
  {
    id: 'track_a_completed',
    category: 'course',
    title: 'Track A 완료',
    description: '기초 트랙 실습을 완료했습니다.',
    shareText: 'Track A를 완료했어요.',
  },
  {
    id: 'track_b_completed',
    category: 'course',
    title: 'Track B 완료',
    description: '워크플로우 트랙 실습을 완료했습니다.',
    shareText: 'Track B를 완료했어요.',
  },
  {
    id: 'track_c_completed',
    category: 'course',
    title: 'Track C 완료',
    description: '심화 트랙 실습을 완료했습니다.',
    shareText: 'Track C를 완료했어요.',
  },
  {
    id: 'full_curriculum_completed',
    category: 'course',
    title: '커리큘럼 완주',
    description: 'Track A~C 전체를 완료했습니다.',
    shareText: '전체 커리큘럼을 완주했어요.',
  },
  {
    id: 'skill_first_split',
    category: 'skill',
    title: '첫 분할',
    description: '실습 중 pane 분할을 1회 실행했습니다.',
    shareText: 'pane 첫 분할 업적을 달성했어요.',
  },
  {
    id: 'skill_triple_panes',
    category: 'skill',
    title: '트리플 스플릿',
    description: '실습 화면에서 pane 3개 레이아웃을 만들었습니다.',
    shareText: '트리플 스플릿 업적을 달성했어요.',
  },
  {
    id: 'skill_split_20',
    category: 'skill',
    title: 'Pane 러너',
    description: '실습 세션에서 pane 분할 누적 20회를 달성했습니다.',
    shareText: 'Pane 러너 업적을 달성했어요.',
  },
  {
    id: 'skill_split_100',
    category: 'skill',
    title: 'Pane 백장',
    description: '실습 세션에서 pane 분할 누적 100회를 달성했습니다.',
    shareText: 'Pane 백장 업적을 달성했어요.',
  },
  {
    id: 'skill_first_window',
    category: 'skill',
    title: '윈도우 입문',
    description: '실습 중 새 window를 생성했습니다.',
    shareText: '윈도우 입문 업적을 달성했어요.',
  },
  {
    id: 'skill_first_session',
    category: 'skill',
    title: '세션 스타터',
    description: '실습 중 새 session을 생성했습니다.',
    shareText: '세션 스타터 업적을 달성했어요.',
  },
  {
    id: 'skill_first_copy_mode',
    category: 'skill',
    title: '복사모드 입문',
    description: '실습 중 copy-mode를 실행했습니다.',
    shareText: '복사모드 입문 업적을 달성했어요.',
  },
  {
    id: 'skill_three_lessons',
    category: 'skill',
    title: '레슨 탐험가',
    description: '서로 다른 레슨 3개에서 tmux 실습을 진행했습니다.',
    shareText: '레슨 탐험가 업적을 달성했어요.',
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
