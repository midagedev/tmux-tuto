import type { AppLesson } from './contentSchema';

export type LessonPracticeType = 'mission' | 'guide';

export function resolveLessonPracticeType(lesson: Pick<AppLesson, 'practiceType'>): LessonPracticeType {
  return lesson.practiceType === 'guide' ? 'guide' : 'mission';
}

export function isGuideLesson(lesson: Pick<AppLesson, 'practiceType'>) {
  return resolveLessonPracticeType(lesson) === 'guide';
}
