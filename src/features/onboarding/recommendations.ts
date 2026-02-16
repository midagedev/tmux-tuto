import type { OnboardingGoal } from './onboardingStore';

type Recommendation = {
  trackSlug: string;
  trackReason: string;
  playbookSlug: string;
  playbookReason: string;
};

const GOAL_RECOMMENDATIONS: Record<OnboardingGoal, Recommendation> = {
  'fast-foundations': {
    trackSlug: 'track-a-foundations',
    trackReason: '세션/윈도우/패인 기본 조작을 가장 빠르게 익힙니다.',
    playbookSlug: 'recommended-config',
    playbookReason: '초기 tmux.conf를 먼저 맞추면 이후 실습이 안정적입니다.',
  },
  'shortcut-review': {
    trackSlug: 'track-b-workflow',
    trackReason: '자주 쓰는 이동/전환 루틴을 복습 중심으로 익힙니다.',
    playbookSlug: 'session-persistence',
    playbookReason: '세션 유지 습관을 붙이면 복습 루틴이 끊기지 않습니다.',
  },
  'advanced-routine': {
    trackSlug: 'track-c-deepwork',
    trackReason: '복합 시나리오와 command-mode 루틴까지 확장합니다.',
    playbookSlug: 'tailscale-ssh-workflow',
    playbookReason: '원격 환경에서 장시간 tmux 세션 운영 흐름을 바로 적용합니다.',
  },
};

export function getGoalLabel(goal: OnboardingGoal) {
  switch (goal) {
    case 'fast-foundations':
      return '업무용 기초 빨리 익히기';
    case 'shortcut-review':
      return '단축키 복습 중심';
    case 'advanced-routine':
      return '고급 루틴까지 완주';
    default:
      return goal;
  }
}

export function getRecommendationByGoal(goal: OnboardingGoal | null) {
  if (!goal) {
    return GOAL_RECOMMENDATIONS['fast-foundations'];
  }

  return GOAL_RECOMMENDATIONS[goal];
}
