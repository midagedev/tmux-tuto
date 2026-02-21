import { describe, expect, it } from 'vitest';
import { parseContent } from './contentSchema';

describe('content schema', () => {
  it('accepts guide lessons without missions', () => {
    const parsed = parseContent({
      version: '1',
      generatedAt: '2026-02-21T00:00:00.000Z',
      tracks: [
        {
          id: 'track-a',
          slug: 'track-a',
          title: 'Track A',
          summary: 'summary',
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
          id: 'lesson-guide-1',
          trackSlug: 'track-a',
          chapterSlug: 'chapter-a',
          slug: 'lesson-guide-1',
          title: 'Guide Lesson',
          practiceType: 'guide',
          estimatedMinutes: 8,
          objectives: ['objective'],
        },
      ],
      missions: [],
      playbooks: [],
    });

    expect(parsed.lessons[0].practiceType).toBe('guide');
    expect(parsed.missions).toHaveLength(0);
  });
});
