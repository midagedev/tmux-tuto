import { getAchievementDefinition } from '../progress';
import { encodeSharePayload, type SharePayload } from './payload';

type AchievementShareTarget = {
  path: string;
  challengeLabel: string;
};

const DEFAULT_TARGET: AchievementShareTarget = {
  path: '/practice?lesson=hello-tmux&mission=hello-tmux-version-check',
  challengeLabel: '첫 3분: tmux 맛보기',
};

const ACHIEVEMENT_TARGETS: Record<string, AchievementShareTarget> = {
  first_mission_passed: {
    path: '/practice?lesson=hello-tmux&mission=hello-tmux-version-check',
    challengeLabel: '첫 3분: tmux 맛보기',
  },
  workspace_bootstrap: {
    path: '/practice?lesson=basics&mission=session-create',
    challengeLabel: '기본 조작: Session/Window/Pane',
  },
  copy_mode_starter: {
    path: '/practice?lesson=copy-search&mission=copy-mode-search-keyword',
    challengeLabel: 'Copy Mode 검색',
  },
  command_flow_starter: {
    path: '/practice?lesson=command-subset&mission=command-mode-prompt-intro',
    challengeLabel: 'Command Mode 운영',
  },
  track_a_completed: {
    path: '/practice?lesson=split-resize&mission=split-two-panes',
    challengeLabel: '다음 트랙: 분할과 리사이즈',
  },
  track_b_completed: {
    path: '/practice?lesson=copy-search&mission=copy-mode-search-keyword',
    challengeLabel: '다음 트랙: Copy Mode 검색',
  },
  track_c_completed: {
    path: '/practice?lesson=command-subset&mission=command-mode-prompt-intro',
    challengeLabel: '확장: Command Mode 운영',
  },
  full_curriculum_completed: {
    path: '/practice?lesson=command-subset&mission=command-mode-tree-intro',
    challengeLabel: '완주자 챌린지: choose-tree 탐색',
  },
  streak_7_days: {
    path: '/practice?lesson=attach-detach&mission=session-attach-reconnect',
    challengeLabel: '세션 유지 루틴',
  },
  lesson_explorer: {
    path: '/practice?lesson=pane-focus-flow&mission=pane-grid-layout',
    challengeLabel: '패인 이동 루틴',
  },
  pane_runner_30: {
    path: '/practice?lesson=split-resize&mission=split-two-panes',
    challengeLabel: '분할과 리사이즈',
  },
  pane_hundred: {
    path: '/practice?lesson=pane-focus-flow&mission=pane-grid-layout',
    challengeLabel: '고난도 패인 챌린지',
  },
  layout_alchemist: {
    path: '/practice?lesson=split-resize&mission=split-resize-adjust',
    challengeLabel: '레이아웃 조정 챌린지',
  },
  focus_navigator: {
    path: '/practice?lesson=pane-focus-flow&mission=window-cycle-practice',
    challengeLabel: '포커스 이동 루틴',
  },
  hidden_trickster: {
    path: '/practice?lesson=command-subset&mission=command-mode-tree-intro',
    challengeLabel: '숨은 트릭 챌린지',
  },
};

function normalizePath(path: string) {
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`.replace(/\/{2,}/g, '/');
}

export function isAchievementShareId(achievementId: string) {
  return Boolean(getAchievementDefinition(achievementId));
}

export function resolveAchievementShareTarget(achievementId: string): AchievementShareTarget {
  return ACHIEVEMENT_TARGETS[achievementId] ?? DEFAULT_TARGET;
}

export function buildAchievementSharePath(achievementId: string, payload?: SharePayload) {
  const encodedId = encodeURIComponent(achievementId);
  const pathname = `/share/achievement/${encodedId}`;
  if (!payload) {
    return pathname;
  }

  const encoded = encodeSharePayload(payload);
  return `${pathname}?d=${encoded}`;
}

export function buildAbsoluteAchievementShareUrl(achievementId: string, payload?: SharePayload) {
  const path = normalizePath(buildAchievementSharePath(achievementId, payload));
  return new URL(path, window.location.origin).toString();
}

export function buildAchievementChallengeShareText(shareText: string, achievementId: string) {
  const target = resolveAchievementShareTarget(achievementId);
  return `tmux-tuto 업적 달성: ${shareText} 지금 ${target.challengeLabel} 챌린지에 도전해보세요.`;
}
