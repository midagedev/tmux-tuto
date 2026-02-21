import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import { loadAppContent } from '../../../features/curriculum/contentLoader';
import type { AppChapter, AppContent, AppLesson, AppMission, AppTrack } from '../../../features/curriculum/contentSchema';
import { buildLessonProgressRows, filterLessonProgressRows, resolveDefaultMissionSlugForLesson, type LessonFilter, type LessonProgressRow } from '../lessonProgress';

type ContentState = {
  status: 'loading' | 'ready' | 'error';
  content: AppContent | null;
};

type UsePracticeLessonSelectionArgs = {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  completedMissionSlugs: string[];
  startMissionSession: (input: { missionSlug: string; lessonSlug: string }) => void;
};

type UsePracticeLessonSelectionResult = {
  contentState: ContentState;
  content: AppContent | null;
  lessonFilter: LessonFilter;
  setLessonFilter: (filter: LessonFilter) => void;
  trackTitleMap: Map<string, string>;
  chapterTitleMap: Map<string, string>;
  filteredLessonRows: LessonProgressRow[];
  lessonMissions: AppMission[];
  selectedLesson: AppLesson | null;
  selectedLessonTrack: AppTrack | null;
  selectedLessonChapter: AppChapter | null;
  selectedMission: AppMission | null;
  selectedLessonSlug: string;
  selectedMissionSlug: string;
  selectedMissionOrder: number | null;
  nextLesson: AppLesson | null;
  selectedMissionCompleted: boolean;
  lessonCompletedMissionCount: number;
  nextIncompleteMission: AppMission | null;
  lessonCompleted: boolean;
  selectLessonForAction: (lessonSlug: string, options?: { resetFilter?: boolean }) => void;
  selectMissionForAction: (missionSlug: string) => void;
  selectNextLessonForAction: () => void;
};

export function usePracticeLessonSelection({
  searchParams,
  setSearchParams,
  completedMissionSlugs,
  startMissionSession,
}: UsePracticeLessonSelectionArgs): UsePracticeLessonSelectionResult {
  const [contentState, setContentState] = useState<ContentState>({
    status: 'loading',
    content: null,
  });
  const [selectedLessonSlug, setSelectedLessonSlug] = useState('');
  const [selectedMissionSlug, setSelectedMissionSlug] = useState('');
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>('all');

  const lessonParam = searchParams.get('lesson') ?? '';
  const missionParam = searchParams.get('mission') ?? '';

  const content = contentState.content;
  const trackTitleMap = useMemo(() => {
    if (!content) {
      return new Map<string, string>();
    }

    return new Map(content.tracks.map((track) => [track.slug, track.title]));
  }, [content]);

  const chapterTitleMap = useMemo(() => {
    if (!content) {
      return new Map<string, string>();
    }

    return new Map(content.chapters.map((chapter) => [chapter.slug, chapter.title]));
  }, [content]);

  const lessonProgressRows = useMemo(() => {
    if (!content) {
      return [];
    }

    return buildLessonProgressRows(content, completedMissionSlugs);
  }, [completedMissionSlugs, content]);

  const filteredLessonRows = useMemo(
    () => filterLessonProgressRows(lessonProgressRows, lessonFilter),
    [lessonFilter, lessonProgressRows],
  );

  const lessonMissions = useMemo(() => {
    if (!content || !selectedLessonSlug) {
      return [];
    }

    return content.missions.filter((mission) => mission.lessonSlug === selectedLessonSlug);
  }, [content, selectedLessonSlug]);

  const selectedMission = useMemo(() => {
    if (!selectedMissionSlug) {
      return null;
    }

    return lessonMissions.find((mission) => mission.slug === selectedMissionSlug) ?? null;
  }, [lessonMissions, selectedMissionSlug]);

  const selectedLesson = useMemo(() => {
    if (!content || !selectedLessonSlug) {
      return null;
    }

    return content.lessons.find((lesson) => lesson.slug === selectedLessonSlug) ?? null;
  }, [content, selectedLessonSlug]);

  const selectedLessonTrack = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    return content.tracks.find((track) => track.slug === selectedLesson.trackSlug) ?? null;
  }, [content, selectedLesson]);

  const selectedLessonChapter = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    return content.chapters.find((chapter) => chapter.slug === selectedLesson.chapterSlug) ?? null;
  }, [content, selectedLesson]);

  const selectedMissionOrder = useMemo(() => {
    if (!selectedMission) {
      return null;
    }

    const index = lessonMissions.findIndex((mission) => mission.slug === selectedMission.slug);
    return index === -1 ? null : index + 1;
  }, [lessonMissions, selectedMission]);

  const nextLesson = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    const index = content.lessons.findIndex((lesson) => lesson.slug === selectedLesson.slug);
    if (index === -1) {
      return null;
    }

    return content.lessons[index + 1] ?? null;
  }, [content, selectedLesson]);

  const selectedMissionCompleted = useMemo(() => {
    if (!selectedMission) {
      return false;
    }
    return completedMissionSlugs.includes(selectedMission.slug);
  }, [completedMissionSlugs, selectedMission]);

  const lessonCompletedMissionCount = useMemo(() => {
    const completedSet = new Set(completedMissionSlugs);
    return lessonMissions.filter((mission) => completedSet.has(mission.slug)).length;
  }, [completedMissionSlugs, lessonMissions]);

  const firstIncompleteMissionInLesson = useMemo(() => {
    return lessonMissions.find((mission) => !completedMissionSlugs.includes(mission.slug)) ?? null;
  }, [completedMissionSlugs, lessonMissions]);

  const nextIncompleteMission = useMemo(() => {
    if (!selectedMission) {
      return firstIncompleteMissionInLesson;
    }

    const index = lessonMissions.findIndex((mission) => mission.slug === selectedMission.slug);
    if (index === -1) {
      return firstIncompleteMissionInLesson;
    }

    for (let cursor = index + 1; cursor < lessonMissions.length; cursor += 1) {
      const mission = lessonMissions[cursor];
      if (!completedMissionSlugs.includes(mission.slug)) {
        return mission;
      }
    }

    if (firstIncompleteMissionInLesson?.slug === selectedMission.slug) {
      return null;
    }
    return firstIncompleteMissionInLesson;
  }, [completedMissionSlugs, firstIncompleteMissionInLesson, lessonMissions, selectedMission]);

  const lessonCompleted = lessonMissions.length > 0 && lessonCompletedMissionCount === lessonMissions.length;

  const selectLessonForAction = useCallback(
    (lessonSlug: string, options?: { resetFilter?: boolean }) => {
      if (!content) {
        return;
      }

      if (!content.lessons.some((lesson) => lesson.slug === lessonSlug)) {
        return;
      }

      if (options?.resetFilter) {
        setLessonFilter('all');
      }

      const nextLessonMissions = content.missions.filter((mission) => mission.lessonSlug === lessonSlug);
      const nextMissionSlug = resolveDefaultMissionSlugForLesson(nextLessonMissions, completedMissionSlugs);
      setSelectedLessonSlug(lessonSlug);
      setSelectedMissionSlug(nextMissionSlug);
      if (nextMissionSlug) {
        startMissionSession({
          missionSlug: nextMissionSlug,
          lessonSlug,
        });
      }
    },
    [completedMissionSlugs, content, startMissionSession],
  );

  const selectMissionForAction = useCallback(
    (missionSlug: string) => {
      setSelectedMissionSlug(missionSlug);
      startMissionSession({
        missionSlug,
        lessonSlug: selectedLessonSlug,
      });
    },
    [selectedLessonSlug, startMissionSession],
  );

  const selectNextLessonForAction = useCallback(() => {
    if (!content || !nextLesson) {
      return;
    }

    setSelectedLessonSlug(nextLesson.slug);
    const nextLessonMissions = content.missions.filter((mission) => mission.lessonSlug === nextLesson.slug);
    const nextMissionSlug = resolveDefaultMissionSlugForLesson(nextLessonMissions, completedMissionSlugs);
    setSelectedMissionSlug(nextMissionSlug);
    if (nextMissionSlug) {
      startMissionSession({
        missionSlug: nextMissionSlug,
        lessonSlug: nextLesson.slug,
      });
    }
  }, [completedMissionSlugs, content, nextLesson, startMissionSession]);

  useEffect(() => {
    let isMounted = true;

    loadAppContent()
      .then((nextContent) => {
        if (!isMounted) {
          return;
        }

        setContentState({
          status: 'ready',
          content: nextContent,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setContentState({
          status: 'error',
          content: null,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!content || selectedLessonSlug) {
      return;
    }

    const firstLessonSlug = content.lessons[0]?.slug ?? '';
    const fromParam = content.lessons.some((lesson) => lesson.slug === lessonParam) ? lessonParam : '';
    setSelectedLessonSlug(fromParam || firstLessonSlug);
  }, [content, lessonParam, selectedLessonSlug]);

  useEffect(() => {
    if (!content || filteredLessonRows.length === 0) {
      return;
    }

    if (filteredLessonRows.some((row) => row.lesson.slug === selectedLessonSlug)) {
      return;
    }

    const nextLessonSlug = filteredLessonRows[0].lesson.slug;
    const nextLessonMissions = content.missions.filter((mission) => mission.lessonSlug === nextLessonSlug);
    setSelectedLessonSlug(nextLessonSlug);
    setSelectedMissionSlug(resolveDefaultMissionSlugForLesson(nextLessonMissions, completedMissionSlugs));
  }, [completedMissionSlugs, content, filteredLessonRows, selectedLessonSlug]);

  useEffect(() => {
    if (!content || !selectedLessonSlug) {
      return;
    }

    const missions = content.missions.filter((mission) => mission.lessonSlug === selectedLessonSlug);

    if (missions.length === 0) {
      if (selectedMissionSlug) {
        setSelectedMissionSlug('');
      }
      return;
    }

    if (missions.some((mission) => mission.slug === selectedMissionSlug)) {
      return;
    }

    const fromParam = missions.some((mission) => mission.slug === missionParam) ? missionParam : '';
    setSelectedMissionSlug(fromParam || resolveDefaultMissionSlugForLesson(missions, completedMissionSlugs));
  }, [completedMissionSlugs, content, missionParam, selectedLessonSlug, selectedMissionSlug]);

  useEffect(() => {
    if (!selectedLessonSlug || !selectedMissionSlug) {
      return;
    }

    if (completedMissionSlugs.includes(selectedMissionSlug)) {
      return;
    }

    startMissionSession({
      missionSlug: selectedMissionSlug,
      lessonSlug: selectedLessonSlug,
    });
  }, [completedMissionSlugs, selectedLessonSlug, selectedMissionSlug, startMissionSession]);

  useEffect(() => {
    if (!selectedLessonSlug) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    if (nextParams.get('lesson') !== selectedLessonSlug) {
      nextParams.set('lesson', selectedLessonSlug);
      changed = true;
    }

    if (selectedMissionSlug) {
      if (nextParams.get('mission') !== selectedMissionSlug) {
        nextParams.set('mission', selectedMissionSlug);
        changed = true;
      }
    } else if (nextParams.has('mission')) {
      nextParams.delete('mission');
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, selectedLessonSlug, selectedMissionSlug, setSearchParams]);

  return {
    contentState,
    content,
    lessonFilter,
    setLessonFilter,
    trackTitleMap,
    chapterTitleMap,
    filteredLessonRows,
    lessonMissions,
    selectedLesson,
    selectedLessonTrack,
    selectedLessonChapter,
    selectedMission,
    selectedLessonSlug,
    selectedMissionSlug,
    selectedMissionOrder,
    nextLesson,
    selectedMissionCompleted,
    lessonCompletedMissionCount,
    nextIncompleteMission,
    lessonCompleted,
    selectLessonForAction,
    selectMissionForAction,
    selectNextLessonForAction,
  };
}
