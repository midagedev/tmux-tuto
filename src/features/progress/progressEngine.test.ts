import { describe, expect, it } from 'vitest';
import {
  calculateLevelFromXp,
  calculateMissionXp,
  calculateNextStreak,
  computeAchievements,
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
});
