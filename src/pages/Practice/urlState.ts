import type { AppContent } from '../../features/curriculum/contentSchema';

export function resolveInitialLessonSlugFromQuery(
  content: AppContent,
  lessonParam: string,
  missionParam: string,
  lessonPathParam = '',
) {
  const firstLessonSlug = content.lessons[0]?.slug ?? '';
  const missionMatch = content.missions.find((mission) => mission.slug === missionParam);

  if (missionMatch) {
    return missionMatch.lessonSlug;
  }

  if (content.lessons.some((lesson) => lesson.slug === lessonPathParam)) {
    return lessonPathParam;
  }

  if (content.lessons.some((lesson) => lesson.slug === lessonParam)) {
    return lessonParam;
  }

  return firstLessonSlug;
}
