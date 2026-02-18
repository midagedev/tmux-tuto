import { describe, expect, it } from 'vitest';
import {
  calculateLevelFromXp,
  calculateMissionXp,
  calculateNextStreak,
  computeCoreAchievements,
  computeFunAchievements,
} from './progressEngine';

describe('progressEngine', () => {
  it('applies difficulty bonus, retry factor, and hint penalty', () => {
    const xp = calculateMissionXp({
      difficulty: 'advanced',
      attemptNumber: 2,
      hintLevel: 1,
    });

    expect(xp).toBe(40);
  });

  it('calculates level thresholds from accumulated XP', () => {
    expect(calculateLevelFromXp(0)).toBe(1);
    expect(calculateLevelFromXp(100)).toBe(2);
    expect(calculateLevelFromXp(240)).toBe(3);
  });

  it('updates streak for same day and next day passes', () => {
    const sameDay = calculateNextStreak('2026-02-16T01:00:00.000Z', '2026-02-16T02:00:00.000Z', 3);
    const nextDay = calculateNextStreak('2026-02-16T01:00:00.000Z', '2026-02-17T02:00:00.000Z', 3);
    const gapDay = calculateNextStreak('2026-02-16T01:00:00.000Z', '2026-02-19T02:00:00.000Z', 3);

    expect(sameDay).toBe(3);
    expect(nextDay).toBe(4);
    expect(gapDay).toBe(1);
  });

  it('unlocks curriculum completion achievement when all tracks are complete', () => {
    const achievements = computeCoreAchievements({
      completedMissionCount: 10,
      streakDays: 8,
      completedTrackSlugs: ['track-a-foundations', 'track-b-workflow', 'track-c-deepwork'],
      splitCount: 1,
      newWindowCount: 1,
      newSessionCount: 1,
      copyModeCount: 1,
      paneResizeCount: 0,
      paneSelectCount: 0,
      layoutSelectCount: 0,
      commandPromptCount: 0,
      chooseTreeCount: 0,
      uniqueLayoutCount: 0,
      lessonCount: 3,
    });

    expect(achievements).toContain('full_curriculum_completed');
    expect(achievements).toContain('streak_7_days');
    expect(achievements).toContain('workspace_bootstrap');
  });

  it('unlocks fun achievements from action counters', () => {
    const achievements = computeFunAchievements({
      splitCount: 100,
      newWindowCount: 1,
      newSessionCount: 1,
      copyModeCount: 1,
      paneResizeCount: 8,
      paneSelectCount: 12,
      layoutSelectCount: 1,
      commandPromptCount: 1,
      chooseTreeCount: 1,
      uniqueLayoutCount: 3,
      lessonCount: 3,
      completedMissionCount: 0,
      streakDays: 0,
      completedTrackSlugs: [],
    });

    expect(achievements).toContain('pane_runner_30');
    expect(achievements).toContain('pane_hundred');
    expect(achievements).toContain('layout_alchemist');
    expect(achievements).toContain('focus_navigator');
    expect(achievements).toContain('hidden_trickster');
  });
});
