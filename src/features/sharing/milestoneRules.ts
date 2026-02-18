import type { AppContent } from '../curriculum/contentSchema';
import type { MilestoneSlug } from './milestones';
type MilestoneProgressInput = {
    content: AppContent;
    completedMissionSlugs: string[];
    streakDays: number;
};
export type MilestoneProgressResult = {
    unlockedMilestones: MilestoneSlug[];
    completedTrackSlugs: string[];
    firstChapterSlug: string | null;
};
export function computeMilestoneProgress({ content, completedMissionSlugs, streakDays, }: MilestoneProgressInput): MilestoneProgressResult {
    const completedSet = new Set(completedMissionSlugs);
    const lessonBySlug = new Map(content.lessons.map((lesson) => [lesson.slug, lesson]));
    const trackMissionSlugs = new Map<string, string[]>();
    content.tracks.forEach((track) => {
        const missionSlugs = content.missions
            .filter((mission) => lessonBySlug.get(mission.lessonSlug)?.trackSlug === track.slug)
            .map((mission) => mission.slug);
        trackMissionSlugs.set(track.slug, missionSlugs);
    });
    const completedTrackSlugs = content.tracks
        .filter((track) => {
        const missionSlugs = trackMissionSlugs.get(track.slug) ?? [];
        if (missionSlugs.length === 0) {
            return false;
        }
        return missionSlugs.every((slug) => completedSet.has(slug));
    })
        .map((track) => track.slug);
    const trackAChapters = content.chapters
        .filter((chapter) => chapter.trackSlug === 'track-a-foundations')
        .sort((a, b) => a.order - b.order);
    const firstChapter = trackAChapters[0] ?? null;
    const firstChapterSlug = firstChapter?.slug ?? null;
    const firstChapterMissionSlugs = firstChapter
        ? content.missions
            .filter((mission) => lessonBySlug.get(mission.lessonSlug)?.chapterSlug === firstChapter.slug)
            .map((mission) => mission.slug)
        : [];
    const unlockedMilestones = new Set<MilestoneSlug>();
    if (firstChapterMissionSlugs.length > 0 && firstChapterMissionSlugs.every((slug) => completedSet.has(slug))) {
        unlockedMilestones.add('first-chapter-complete');
    }
    if (completedTrackSlugs.includes('track-a-foundations')) {
        unlockedMilestones.add('track-a-complete');
    }
    if (completedTrackSlugs.includes('track-b-workflow')) {
        unlockedMilestones.add('track-b-complete');
    }
    if (completedTrackSlugs.includes('track-c-deepwork')) {
        unlockedMilestones.add('track-c-complete');
    }
    if (streakDays >= 7) {
        unlockedMilestones.add('streak-7');
    }
    if (completedTrackSlugs.includes('track-a-foundations') &&
        completedTrackSlugs.includes('track-b-workflow') &&
        completedTrackSlugs.includes('track-c-deepwork')) {
        unlockedMilestones.add('final-complete');
    }
    return {
        unlockedMilestones: Array.from(unlockedMilestones),
        completedTrackSlugs,
        firstChapterSlug,
    };
}
