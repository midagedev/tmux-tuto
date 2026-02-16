export type MilestoneSlug =
  | 'first-chapter-complete'
  | 'track-a-complete'
  | 'track-b-complete'
  | 'track-c-complete'
  | 'streak-7'
  | 'final-complete';

type MilestoneMeta = {
  title: string;
  description: string;
  badge: string;
  ogImage: string;
};

const MILESTONE_MAP: Record<MilestoneSlug, MilestoneMeta> = {
  'first-chapter-complete': {
    title: '첫 챕터 완료',
    description: '첫 챕터 실습을 통과하고 기본 조작 흐름을 익혔습니다.',
    badge: 'first_chapter_complete',
    ogImage: '/og/first-chapter-complete.v1.png',
  },
  'track-a-complete': {
    title: 'Track A 완료',
    description: '세션/윈도우/패인 기본 조작을 실습으로 익혔습니다.',
    badge: 'track_a_complete',
    ogImage: '/og/track-a-complete.v1.png',
  },
  'track-b-complete': {
    title: 'Track B 완료',
    description: '워크플로우 전환과 copy-mode 핵심 루틴을 익혔습니다.',
    badge: 'track_b_complete',
    ogImage: '/og/track-b-complete.v1.png',
  },
  'track-c-complete': {
    title: 'Track C 완료',
    description: 'command-mode와 deep work 루틴 시나리오를 완료했습니다.',
    badge: 'track_c_complete',
    ogImage: '/og/track-c-complete.v1.png',
  },
  'streak-7': {
    title: '7일 스트릭 달성',
    description: '7일 연속 학습으로 tmux 루틴을 안정적으로 유지했습니다.',
    badge: 'streak_7_days',
    ogImage: '/og/streak-7.v1.png',
  },
  'final-complete': {
    title: '전체 커리큘럼 완료',
    description: 'Track A~C 전체 실습을 완료했습니다.',
    badge: 'full_curriculum_completed',
    ogImage: '/og/final-complete.v1.png',
  },
};

export function getMilestoneMeta(slug: string): MilestoneMeta | null {
  if (slug in MILESTONE_MAP) {
    return MILESTONE_MAP[slug as MilestoneSlug];
  }

  return null;
}

export function listMilestoneSlugs() {
  return Object.keys(MILESTONE_MAP) as MilestoneSlug[];
}

export function isMilestoneSlug(slug: string): slug is MilestoneSlug {
  return slug in MILESTONE_MAP;
}
