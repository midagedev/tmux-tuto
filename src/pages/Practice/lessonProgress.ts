import type { AppContent, AppLesson, AppMission } from '../../features/curriculum/contentSchema';
export type LessonCompletionStatus = 'not-started' | 'in-progress' | 'completed';
export type LessonFilter = 'all' | 'continue' | 'incomplete' | 'completed';
export type LessonProgressRow = {
    lesson: AppLesson;
    totalMissionCount: number;
    completedMissionCount: number;
    status: LessonCompletionStatus;
    firstIncompleteMissionSlug: string | null;
};
export function buildLessonProgressRows(content: AppContent, completedMissionSlugs: string[]) {
    const completedSet = new Set(completedMissionSlugs);
    const missionMap = new Map<string, AppMission[]>();
    content.lessons.forEach((lesson) => {
        missionMap.set(lesson.slug, []);
    });
    content.missions.forEach((mission) => {
        const lessonMissions = missionMap.get(mission.lessonSlug);
        if (!lessonMissions) {
            return;
        }
        lessonMissions.push(mission);
    });
    return content.lessons.map<LessonProgressRow>((lesson) => {
        const lessonMissions = missionMap.get(lesson.slug) ?? [];
        const totalMissionCount = lessonMissions.length;
        const completedMissionCount = lessonMissions.filter((mission) => completedSet.has(mission.slug)).length;
        const firstIncompleteMissionSlug = lessonMissions.find((mission) => !completedSet.has(mission.slug))?.slug ?? null;
        let status: LessonCompletionStatus = 'not-started';
        if (totalMissionCount > 0 && completedMissionCount === totalMissionCount) {
            status = 'completed';
        }
        else if (completedMissionCount > 0) {
            status = 'in-progress';
        }
        return {
            lesson,
            totalMissionCount,
            completedMissionCount,
            status,
            firstIncompleteMissionSlug,
        };
    });
}
export function filterLessonProgressRows(rows: LessonProgressRow[], filter: LessonFilter) {
    switch (filter) {
        case 'continue':
            return rows.filter((row) => row.status === 'in-progress');
        case 'incomplete':
            return rows.filter((row) => row.status !== 'completed');
        case 'completed':
            return rows.filter((row) => row.status === 'completed');
        case 'all':
        default:
            return rows;
    }
}
export function resolveDefaultMissionSlugForLesson(lessonMissions: AppMission[], completedMissionSlugs: string[]) {
    if (lessonMissions.length === 0) {
        return '';
    }
    const completedSet = new Set(completedMissionSlugs);
    const nextMission = lessonMissions.find((mission) => !completedSet.has(mission.slug));
    return nextMission?.slug ?? lessonMissions[0].slug;
}
