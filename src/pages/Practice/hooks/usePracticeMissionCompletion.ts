import { useCallback, useEffect, useRef } from 'react';
import { trackClarityEvent } from '../../../features/analytics';
import type { AppContent, AppLesson, AppMission } from '../../../features/curriculum/contentSchema';
import { useProgressStore } from '../../../features/progress/progressStore';
import type { evaluateMissionWithVmSnapshot } from '../../../features/vm/missionBridge';
import { computeCompletedTrackSlugs } from '../practiceVmHelpers';

type MissionEvaluation = ReturnType<typeof evaluateMissionWithVmSnapshot>;

type UsePracticeMissionCompletionArgs = {
  content: AppContent | null;
  selectedLesson: AppLesson | null;
  selectedMission: AppMission | null;
  selectedMissionStatus: MissionEvaluation | null;
  lessonMissions: AppMission[];
  completedMissionSlugs: string[];
  recordMissionPass: ReturnType<typeof useProgressStore.getState>['recordMissionPass'];
};

type UsePracticeMissionCompletionResult = {
  handleManualMissionComplete: () => void;
};

export function usePracticeMissionCompletion({
  content,
  selectedLesson,
  selectedMission,
  selectedMissionStatus,
  lessonMissions,
  completedMissionSlugs,
  recordMissionPass,
}: UsePracticeMissionCompletionArgs): UsePracticeMissionCompletionResult {
  const processedMissionSetRef = useRef(new Set<string>());

  const completeSelectedMission = useCallback(
    (mode: 'auto' | 'manual') => {
      if (!content || !selectedMission || !selectedLesson) {
        return;
      }

      const missionSlug = selectedMission.slug;
      if (completedMissionSlugs.includes(missionSlug)) {
        return;
      }

      const nextCompletedMissionSlugs = [...completedMissionSlugs, missionSlug];
      const completedTrackSlugs = computeCompletedTrackSlugs(content, nextCompletedMissionSlugs);

      recordMissionPass({
        missionSlug,
        difficulty: selectedMission.difficulty,
        hintLevel: mode === 'manual' ? 1 : 0,
        attemptNumber: 1,
        completedTrackSlugs,
      });

      const completedSetBefore = new Set(completedMissionSlugs);
      const completedSetAfter = new Set(nextCompletedMissionSlugs);
      const lessonWasCompleted =
        lessonMissions.length > 0 && lessonMissions.every((mission) => completedSetBefore.has(mission.slug));
      const lessonNowCompleted =
        lessonMissions.length > 0 && lessonMissions.every((mission) => completedSetAfter.has(mission.slug));
      const lessonJustCompleted = !lessonWasCompleted && lessonNowCompleted;

      if (lessonJustCompleted) {
        trackClarityEvent('practice_lesson_completed');
      } else {
        trackClarityEvent(mode === 'manual' ? 'practice_mission_completed_manual' : 'practice_mission_completed_auto');
      }
    },
    [completedMissionSlugs, content, lessonMissions, recordMissionPass, selectedLesson, selectedMission],
  );

  useEffect(() => {
    if (!content || !selectedMission || !selectedMissionStatus) {
      return;
    }

    const missionSlug = selectedMission.slug;

    if (selectedMissionStatus.status !== 'complete') {
      return;
    }

    if (processedMissionSetRef.current.has(missionSlug)) {
      return;
    }

    if (completedMissionSlugs.includes(missionSlug)) {
      processedMissionSetRef.current.add(missionSlug);
      return;
    }

    processedMissionSetRef.current.add(missionSlug);
    completeSelectedMission('auto');
  }, [completeSelectedMission, completedMissionSlugs, content, selectedMission, selectedMissionStatus]);

  const handleManualMissionComplete = useCallback(() => {
    if (!selectedMission) {
      return;
    }

    const missionSlug = selectedMission.slug;
    if (completedMissionSlugs.includes(missionSlug)) {
      return;
    }

    processedMissionSetRef.current.add(missionSlug);
    completeSelectedMission('manual');
  }, [completeSelectedMission, completedMissionSlugs, selectedMission]);

  return {
    handleManualMissionComplete,
  };
}
