import {
  parseContent,
  type AppChapter,
  type AppContent,
  type AppLesson,
  type AppMission,
  type AppPlaybook,
  type AppTrack,
} from './contentSchema';

let cachedContent: AppContent | null = null;
let rawContentPromise: Promise<unknown> | null = null;

export async function loadAppContent() {
  if (cachedContent) {
    return cachedContent;
  }

  if (!rawContentPromise) {
    rawContentPromise = import('../../content/v1/content.json').then((module) => module.default);
  }

  const rawContent = await rawContentPromise;
  cachedContent = parseContent(rawContent);
  return cachedContent;
}

export function clearContentCache() {
  cachedContent = null;
  rawContentPromise = null;
}

export function getTrackBySlug(content: AppContent, trackSlug: string): AppTrack | undefined {
  return content.tracks.find((track) => track.slug === trackSlug);
}

export function getChapterBySlug(content: AppContent, chapterSlug: string): AppChapter | undefined {
  return content.chapters.find((chapter) => chapter.slug === chapterSlug);
}

export function getLessonBySlug(content: AppContent, lessonSlug: string): AppLesson | undefined {
  return content.lessons.find((lesson) => lesson.slug === lessonSlug);
}

export function getMissionBySlug(content: AppContent, missionSlug: string): AppMission | undefined {
  return content.missions.find((mission) => mission.slug === missionSlug);
}

export function getPlaybookBySlug(
  content: AppContent,
  playbookSlug: string,
): AppPlaybook | undefined {
  return content.playbooks.find((playbook) => playbook.slug === playbookSlug);
}
