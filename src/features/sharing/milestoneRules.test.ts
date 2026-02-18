import { describe, expect, it } from 'vitest';
import { loadAppContent } from '../curriculum/contentLoader';
import { computeMilestoneProgress } from './milestoneRules';

describe('milestoneRules', () => {
  it('requires all first chapter missions before unlocking first-chapter milestone', async () => {
    const content = await loadAppContent();

    const partial = computeMilestoneProgress({
      content,
      completedMissionSlugs: ['hello-tmux-version-check'],
      streakDays: 0,
    });

    const complete = computeMilestoneProgress({
      content,
      completedMissionSlugs: ['hello-tmux-version-check', 'hello-tmux-session-list'],
      streakDays: 0,
    });

    expect(partial.unlockedMilestones).not.toContain('first-chapter-complete');
    expect(complete.unlockedMilestones).toContain('first-chapter-complete');
    expect(complete.firstChapterSlug).toBe('tmux-onramp');
  });

  it('unlocks final milestone only when all track missions are complete', async () => {
    const content = await loadAppContent();

    const allMissionSlugs = content.missions.map((mission) => mission.slug);
    const result = computeMilestoneProgress({
      content,
      completedMissionSlugs: allMissionSlugs,
      streakDays: 8,
    });

    expect(result.completedTrackSlugs).toEqual(
      expect.arrayContaining(['track-a-foundations', 'track-b-workflow', 'track-c-deepwork']),
    );
    expect(result.unlockedMilestones).toEqual(
      expect.arrayContaining(['track-a-complete', 'track-b-complete', 'track-c-complete', 'final-complete', 'streak-7']),
    );
  });
});
