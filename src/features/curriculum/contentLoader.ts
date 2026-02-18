import {
  parseContent,
  type AppChapter,
  type AppContent,
  type AppLesson,
  type AppMission,
  type AppPlaybook,
  type AppTrack,
} from './contentSchema';
import { resolveLanguageFromRuntime } from '../../i18n/runtime';
import type { SupportedLanguage } from '../../i18n/messages';

let cachedContent: AppContent | null = null;
let rawContentPromise: Promise<unknown> | null = null;

export async function loadAppContent() {
  if (cachedContent) {
    return cachedContent;
  }

  if (!rawContentPromise) {
    rawContentPromise = loadRawContentByLanguage(resolveLanguageFromRuntime());
  }

  const rawContent = await rawContentPromise;
  cachedContent = parseContent(rawContent);
  return cachedContent;
}

export function clearContentCache() {
  cachedContent = null;
  rawContentPromise = null;
}

async function loadRawContentByLanguage(language: SupportedLanguage) {
  const loaders: Record<SupportedLanguage, () => Promise<unknown>> = {
    en: () => import('../../content/v1/i18n/en/content.json').then((module) => module.default),
    ko: () => import('../../content/v1/i18n/ko/content.json').then((module) => module.default),
    ja: () => import('../../content/v1/i18n/ja/content.json').then((module) => module.default),
    zh: () => import('../../content/v1/i18n/zh/content.json').then((module) => module.default),
  };

  try {
    return await loaders[language]();
  } catch {
    return loaders.en();
  }
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
