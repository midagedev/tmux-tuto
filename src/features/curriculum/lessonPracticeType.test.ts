import { describe, expect, it } from 'vitest';
import { isGuideLesson, resolveLessonPracticeType } from './lessonPracticeType';

describe('lessonPracticeType', () => {
  it('treats undefined as mission', () => {
    expect(resolveLessonPracticeType({ practiceType: undefined })).toBe('mission');
    expect(isGuideLesson({ practiceType: undefined })).toBe(false);
  });

  it('returns guide when lesson is explicitly marked', () => {
    expect(resolveLessonPracticeType({ practiceType: 'guide' })).toBe('guide');
    expect(isGuideLesson({ practiceType: 'guide' })).toBe(true);
  });
});
