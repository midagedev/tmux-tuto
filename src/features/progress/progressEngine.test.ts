import { describe, expect, it } from 'vitest';
import {
  calculateLevelFromXp,
  calculateMissionXp,
  calculateNextStreak,
  computeAchievements,
  computeSkillAchievements,
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
    const achievements = computeAchievements({
      completedMissionCount: 10,
      streakDays: 8,
      completedTrackSlugs: ['track-a-foundations', 'track-b-workflow', 'track-c-deepwork'],
    });

    expect(achievements).toContain('full_curriculum_completed');
    expect(achievements).toContain('streak_7_days');
  });

  it('unlocks tmux skill achievements from action counters', () => {
    const achievements = computeSkillAchievements({
      splitCount: 100,
      maxPaneCount: 3,
      newWindowCount: 1,
      newSessionCount: 1,
      copyModeCount: 1,
      paneResizeCount: 8,
      paneSelectCount: 12,
      paneSwapCount: 1,
      windowRotateCount: 1,
      layoutSelectCount: 1,
      zoomToggleCount: 1,
      syncToggleCount: 1,
      commandPromptCount: 1,
      chooseTreeCount: 1,
      uniqueLayoutCount: 2,
      zoomObserved: true,
      syncObserved: true,
      lessonCount: 3,
    });

    expect(achievements).toContain('skill_first_split');
    expect(achievements).toContain('skill_split_100');
    expect(achievements).toContain('skill_triple_panes');
    expect(achievements).toContain('skill_first_window');
    expect(achievements).toContain('skill_first_session');
    expect(achievements).toContain('skill_first_copy_mode');
    expect(achievements).toContain('skill_layout_first');
    expect(achievements).toContain('skill_zoom_control');
    expect(achievements).toContain('skill_sync_control');
    expect(achievements).toContain('skill_command_prompt');
    expect(achievements).toContain('skill_choose_tree');
    expect(achievements).toContain('skill_resize_5');
    expect(achievements).toContain('skill_pane_navigator');
    expect(achievements).toContain('skill_swap_first');
    expect(achievements).toContain('skill_rotate_first');
    expect(achievements).toContain('skill_three_lessons');
  });
});
