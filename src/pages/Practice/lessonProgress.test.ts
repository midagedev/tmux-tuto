import { describe, expect, it } from 'vitest';
import type { AppContent } from '../../features/curriculum/contentSchema';
import {
  buildLessonProgressRows,
  filterLessonProgressRows,
  resolveDefaultMissionSlugForLesson,
} from './lessonProgress';

const contentFixture: AppContent = {
  version: '1',
  generatedAt: '2026-02-18T00:00:00.000Z',
  tracks: [
    {
      id: 'track-a',
      slug: 'track-a',
      title: 'Track A',
      summary: 'A',
      order: 1,
      status: 'active',
    },
  ],
  chapters: [
    {
      id: 'chapter-a',
      trackSlug: 'track-a',
      slug: 'chapter-a',
      title: 'Chapter A',
      order: 1,
    },
  ],
  lessons: [
    {
      id: 'lesson-1',
      trackSlug: 'track-a',
      chapterSlug: 'chapter-a',
      slug: 'lesson-1',
      title: 'Lesson 1',
      estimatedMinutes: 5,
      objectives: ['obj-1'],
    },
    {
      id: 'lesson-2',
      trackSlug: 'track-a',
      chapterSlug: 'chapter-a',
      slug: 'lesson-2',
      title: 'Lesson 2',
      estimatedMinutes: 5,
      objectives: ['obj-2'],
    },
    {
      id: 'lesson-3',
      trackSlug: 'track-a',
      chapterSlug: 'chapter-a',
      slug: 'lesson-3',
      title: 'Lesson 3',
      estimatedMinutes: 5,
      objectives: ['obj-3'],
    },
  ],
  missions: [
    {
      id: 'm-1',
      lessonSlug: 'lesson-1',
      slug: 'm-1',
      title: 'Mission 1',
      type: 'state-check',
      difficulty: 'beginner',
      initialScenario: 'empty',
      passRules: [],
      hints: [],
    },
    {
      id: 'm-2',
      lessonSlug: 'lesson-1',
      slug: 'm-2',
      title: 'Mission 2',
      type: 'state-check',
      difficulty: 'beginner',
      initialScenario: 'empty',
      passRules: [],
      hints: [],
    },
    {
      id: 'm-3',
      lessonSlug: 'lesson-2',
      slug: 'm-3',
      title: 'Mission 3',
      type: 'state-check',
      difficulty: 'beginner',
      initialScenario: 'empty',
      passRules: [],
      hints: [],
    },
  ],
  playbooks: [],
};

describe('buildLessonProgressRows', () => {
  it('derives completed, in-progress, not-started statuses', () => {
    const rows = buildLessonProgressRows(contentFixture, ['m-1', 'm-2']);
    expect(rows).toHaveLength(3);

    expect(rows[0]).toMatchObject({
      completedMissionCount: 2,
      totalMissionCount: 2,
      status: 'completed',
      firstIncompleteMissionSlug: null,
    });
    expect(rows[1]).toMatchObject({
      completedMissionCount: 0,
      totalMissionCount: 1,
      status: 'not-started',
      firstIncompleteMissionSlug: 'm-3',
    });
    expect(rows[2]).toMatchObject({
      completedMissionCount: 0,
      totalMissionCount: 0,
      status: 'not-started',
      firstIncompleteMissionSlug: null,
    });
  });

  it('marks lesson as in-progress when only part of missions are completed', () => {
    const rows = buildLessonProgressRows(contentFixture, ['m-1']);
    expect(rows[0].status).toBe('in-progress');
    expect(rows[0].firstIncompleteMissionSlug).toBe('m-2');
  });
});

describe('filterLessonProgressRows', () => {
  it('filters rows by requested mode', () => {
    const rows = buildLessonProgressRows(contentFixture, ['m-1', 'm-2']);

    expect(filterLessonProgressRows(rows, 'all')).toHaveLength(3);
    expect(filterLessonProgressRows(rows, 'completed').map((row) => row.lesson.slug)).toEqual(['lesson-1']);
    expect(filterLessonProgressRows(rows, 'continue')).toHaveLength(0);
    expect(filterLessonProgressRows(rows, 'incomplete').map((row) => row.lesson.slug)).toEqual([
      'lesson-2',
      'lesson-3',
    ]);
  });
});

describe('resolveDefaultMissionSlugForLesson', () => {
  it('returns first incomplete mission by default', () => {
    const lessonMissions = contentFixture.missions.filter((mission) => mission.lessonSlug === 'lesson-1');
    expect(resolveDefaultMissionSlugForLesson(lessonMissions, ['m-1'])).toBe('m-2');
  });

  it('falls back to first mission when all are completed', () => {
    const lessonMissions = contentFixture.missions.filter((mission) => mission.lessonSlug === 'lesson-1');
    expect(resolveDefaultMissionSlugForLesson(lessonMissions, ['m-1', 'm-2'])).toBe('m-1');
  });

  it('returns empty string when no mission exists', () => {
    expect(resolveDefaultMissionSlugForLesson([], [])).toBe('');
  });
});
