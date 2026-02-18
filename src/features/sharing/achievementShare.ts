import { getAchievementDefinition } from '../progress';
import { encodeSharePayload, type SharePayload } from './payload';
type AchievementShareTarget = {
    path: string;
    challengeLabel: string;
};
const DEFAULT_TARGET: AchievementShareTarget = {
    path: '/practice?lesson=hello-tmux&mission=hello-tmux-version-check',
    challengeLabel: __tx("\uCCAB 3\uBD84: tmux \uB9DB\uBCF4\uAE30"),
};
const ACHIEVEMENT_TARGETS: Record<string, AchievementShareTarget> = {
    first_mission_passed: {
        path: '/practice?lesson=hello-tmux&mission=hello-tmux-version-check',
        challengeLabel: __tx("\uCCAB 3\uBD84: tmux \uB9DB\uBCF4\uAE30"),
    },
    workspace_bootstrap: {
        path: '/practice?lesson=basics&mission=session-create',
        challengeLabel: __tx("\uAE30\uBCF8 \uC870\uC791: Session/Window/Pane"),
    },
    copy_mode_starter: {
        path: '/practice?lesson=copy-search&mission=copy-mode-search-keyword',
        challengeLabel: __tx("Copy Mode \uAC80\uC0C9"),
    },
    command_flow_starter: {
        path: '/practice?lesson=command-subset&mission=command-mode-prompt-intro',
        challengeLabel: __tx("Command Mode \uC6B4\uC601"),
    },
    track_a_completed: {
        path: '/practice?lesson=split-resize&mission=split-two-panes',
        challengeLabel: __tx("\uB2E4\uC74C \uD2B8\uB799: \uBD84\uD560\uACFC \uB9AC\uC0AC\uC774\uC988"),
    },
    track_b_completed: {
        path: '/practice?lesson=copy-search&mission=copy-mode-search-keyword',
        challengeLabel: __tx("\uB2E4\uC74C \uD2B8\uB799: Copy Mode \uAC80\uC0C9"),
    },
    track_c_completed: {
        path: '/practice?lesson=command-subset&mission=command-mode-prompt-intro',
        challengeLabel: __tx("\uD655\uC7A5: Command Mode \uC6B4\uC601"),
    },
    full_curriculum_completed: {
        path: '/practice?lesson=command-subset&mission=command-mode-tree-intro',
        challengeLabel: __tx("\uC644\uC8FC\uC790 \uCC4C\uB9B0\uC9C0: choose-tree \uD0D0\uC0C9"),
    },
    streak_7_days: {
        path: '/practice?lesson=attach-detach&mission=session-attach-reconnect',
        challengeLabel: __tx("\uC138\uC158 \uC720\uC9C0 \uB8E8\uD2F4"),
    },
    lesson_explorer: {
        path: '/practice?lesson=pane-focus-flow&mission=pane-grid-layout',
        challengeLabel: __tx("\uD328\uC778 \uC774\uB3D9 \uB8E8\uD2F4"),
    },
    pane_runner_30: {
        path: '/practice?lesson=split-resize&mission=split-two-panes',
        challengeLabel: __tx("\uBD84\uD560\uACFC \uB9AC\uC0AC\uC774\uC988"),
    },
    pane_hundred: {
        path: '/practice?lesson=pane-focus-flow&mission=pane-grid-layout',
        challengeLabel: __tx("\uACE0\uB09C\uB3C4 \uD328\uC778 \uCC4C\uB9B0\uC9C0"),
    },
    layout_alchemist: {
        path: '/practice?lesson=split-resize&mission=split-resize-adjust',
        challengeLabel: __tx("\uB808\uC774\uC544\uC6C3 \uC870\uC815 \uCC4C\uB9B0\uC9C0"),
    },
    focus_navigator: {
        path: '/practice?lesson=pane-focus-flow&mission=window-cycle-practice',
        challengeLabel: __tx("\uD3EC\uCEE4\uC2A4 \uC774\uB3D9 \uB8E8\uD2F4"),
    },
    hidden_trickster: {
        path: '/practice?lesson=command-subset&mission=command-mode-tree-intro',
        challengeLabel: __tx("\uC228\uC740 \uD2B8\uB9AD \uCC4C\uB9B0\uC9C0"),
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
    return __tx("tmux-tuto \uC5C5\uC801 \uB2EC\uC131: ") + shareText + __tx(" \uC9C0\uAE08 ") + target.challengeLabel + __tx(" \uCC4C\uB9B0\uC9C0\uC5D0 \uB3C4\uC804\uD574\uBCF4\uC138\uC694.");
}
