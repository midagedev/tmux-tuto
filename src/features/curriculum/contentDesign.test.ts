import { describe, expect, it } from 'vitest';
import { loadAppContent } from './contentLoader';

describe('curriculum content design', () => {
  it('keeps lesson goals, completion criteria, and failure states visible', async () => {
    const content = await loadAppContent();

    content.lessons.forEach((lesson) => {
      expect(lesson.goal && lesson.goal.trim().length > 0).toBe(true);
      expect((lesson.successCriteria?.length ?? 0) > 0).toBe(true);
      expect((lesson.failureStates?.length ?? 0) > 0).toBe(true);
    });
  });

  it('keeps lesson missions in 2-3 range for progressive practice', async () => {
    const content = await loadAppContent();
    const missionCountByLesson = new Map<string, number>();

    content.missions.forEach((mission) => {
      missionCountByLesson.set(mission.lessonSlug, (missionCountByLesson.get(mission.lessonSlug) ?? 0) + 1);
      expect(mission.passRules.length).toBeGreaterThan(0);
      expect(mission.hints.length).toBeGreaterThanOrEqual(2);
    });

    content.lessons.forEach((lesson) => {
      const missionCount = missionCountByLesson.get(lesson.slug) ?? 0;
      expect(missionCount).toBeGreaterThanOrEqual(2);
      expect(missionCount).toBeLessThanOrEqual(3);
    });
  });
});
