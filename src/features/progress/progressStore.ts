import { create } from 'zustand';

type ProgressState = {
  xp: number;
  level: number;
  streakDays: number;
  completedMissionSlugs: string[];
  addCompletedMission: (missionSlug: string) => void;
  setProgressSummary: (payload: { xp: number; level: number; streakDays: number }) => void;
};

export const useProgressStore = create<ProgressState>((set) => ({
  xp: 0,
  level: 1,
  streakDays: 0,
  completedMissionSlugs: [],
  addCompletedMission: (missionSlug) =>
    set((state) => ({
      completedMissionSlugs: state.completedMissionSlugs.includes(missionSlug)
        ? state.completedMissionSlugs
        : [...state.completedMissionSlugs, missionSlug],
    })),
  setProgressSummary: ({ xp, level, streakDays }) => set({ xp, level, streakDays }),
}));
