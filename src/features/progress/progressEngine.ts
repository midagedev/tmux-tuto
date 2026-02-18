export type MissionDifficulty = 'beginner' | 'daily' | 'advanced' | 'scenario';
type XpInput = {
    difficulty: MissionDifficulty;
    attemptNumber: number;
    hintLevel: 0 | 1 | 2 | 3;
};
export type AchievementEvaluationInput = {
    completedMissionCount: number;
    streakDays: number;
    completedTrackSlugs: string[];
    splitCount: number;
    newWindowCount: number;
    newSessionCount: number;
    copyModeCount: number;
    paneResizeCount: number;
    paneSelectCount: number;
    layoutSelectCount: number;
    commandPromptCount: number;
    chooseTreeCount: number;
    uniqueLayoutCount: number;
    lessonCount: number;
};
const DIFFICULTY_BONUS: Record<MissionDifficulty, number> = {
    beginner: 0,
    daily: 10,
    advanced: 25,
    scenario: 40,
};
function getRepeatFactor(attemptNumber: number) {
    if (attemptNumber <= 1) {
        return 1;
    }
    if (attemptNumber === 2) {
        return 0.6;
    }
    return 0.2;
}
function getHintPenalty(hintLevel: XpInput['hintLevel']) {
    switch (hintLevel) {
        case 0:
            return 0;
        case 1:
            return 5;
        case 2:
            return 10;
        case 3:
            return 20;
        default:
            return 0;
    }
}
export function calculateMissionXp({ difficulty, attemptNumber, hintLevel }: XpInput) {
    const baseXp = 50;
    const bonus = DIFFICULTY_BONUS[difficulty] ?? 0;
    const repeatFactor = getRepeatFactor(attemptNumber);
    const hintPenalty = getHintPenalty(hintLevel);
    const rawXp = Math.round((baseXp + bonus) * repeatFactor - hintPenalty);
    return Math.max(0, rawXp);
}
function requiredXpForLevel(level: number) {
    if (level <= 1) {
        return 0;
    }
    return Math.round(100 * (level - 1) + 20 * (level - 1) * (level - 2));
}
export function calculateLevelFromXp(totalXp: number) {
    let level = 1;
    while (requiredXpForLevel(level + 1) <= totalXp) {
        level += 1;
    }
    return level;
}
function isSameDay(a: Date, b: Date) {
    return (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}
function isNextDay(previous: Date, current: Date) {
    const prev = new Date(previous);
    prev.setHours(0, 0, 0, 0);
    const curr = new Date(current);
    curr.setHours(0, 0, 0, 0);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays === 1;
}
export function calculateNextStreak(lastPassDate: string | null, nowIso: string, currentStreak: number) {
    const now = new Date(nowIso);
    if (!lastPassDate) {
        return 1;
    }
    const previous = new Date(lastPassDate);
    if (isSameDay(previous, now)) {
        return currentStreak;
    }
    if (isNextDay(previous, now)) {
        return currentStreak + 1;
    }
    return 1;
}
export function computeCoreAchievements(input: AchievementEvaluationInput) {
    const unlocked: string[] = [];
    if (input.completedMissionCount >= 1) {
        unlocked.push('first_mission_passed');
    }
    if (input.newSessionCount >= 1 && input.newWindowCount >= 1 && input.splitCount >= 1) {
        unlocked.push('workspace_bootstrap');
    }
    if (input.copyModeCount >= 1) {
        unlocked.push('copy_mode_starter');
    }
    if (input.commandPromptCount >= 1 || input.chooseTreeCount >= 1) {
        unlocked.push('command_flow_starter');
    }
    if (input.completedTrackSlugs.includes('track-a-foundations')) {
        unlocked.push('track_a_completed');
    }
    if (input.completedTrackSlugs.includes('track-b-workflow')) {
        unlocked.push('track_b_completed');
    }
    if (input.completedTrackSlugs.includes('track-c-deepwork')) {
        unlocked.push('track_c_completed');
    }
    if (input.completedTrackSlugs.includes('track-a-foundations') &&
        input.completedTrackSlugs.includes('track-b-workflow') &&
        input.completedTrackSlugs.includes('track-c-deepwork')) {
        unlocked.push('full_curriculum_completed');
    }
    if (input.streakDays >= 7) {
        unlocked.push('streak_7_days');
    }
    if (input.lessonCount >= 3) {
        unlocked.push('lesson_explorer');
    }
    return unlocked;
}
export function computeFunAchievements(input: AchievementEvaluationInput) {
    const unlocked: string[] = [];
    if (input.splitCount >= 30) {
        unlocked.push('pane_runner_30');
    }
    if (input.splitCount >= 100) {
        unlocked.push('pane_hundred');
    }
    if (input.layoutSelectCount >= 1 || input.uniqueLayoutCount >= 3) {
        unlocked.push('layout_alchemist');
    }
    if (input.paneSelectCount >= 12 || input.paneResizeCount >= 8) {
        unlocked.push('focus_navigator');
    }
    if (input.commandPromptCount >= 1 && input.chooseTreeCount >= 1) {
        unlocked.push('hidden_trickster');
    }
    return unlocked;
}
// Backward-compatible helper used by legacy tests/callers.
export function computeAchievements(input: AchievementEvaluationInput) {
    return computeCoreAchievements(input);
}
