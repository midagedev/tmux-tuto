import { create } from 'zustand';
import {
  calculateLevelFromXp,
  calculateMissionXp,
  calculateNextStreak,
  computeAchievements,
  type MissionDifficulty,
} from './progressEngine';

type MissionPassPayload = {
  missionSlug: string;
  difficulty: MissionDifficulty;
  hintLevel: 0 | 1 | 2 | 3;
  attemptNumber: number;
  nowIso?: string;
  completedTrackSlugs?: string[];
};

type ProgressState = {
  xp: number;
  level: number;
  streakDays: number;
  lastMissionPassDate: string | null;
  completedMissionSlugs: string[];
  unlockedAchievements: string[];
  recordMissionPass: (payload: MissionPassPayload) => number;
  addCompletedMission: (missionSlug: string) => void;
  setProgressSummary: (payload: { xp: number; level: number; streakDays: number }) => void;
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  xp: 0,
  level: 1,
  streakDays: 0,
  lastMissionPassDate: null,
  completedMissionSlugs: [],
  unlockedAchievements: [],
  recordMissionPass: (payload) => {
    const state = get();
    const nowIso = payload.nowIso ?? new Date().toISOString();

    const gainedXp = calculateMissionXp({
      difficulty: payload.difficulty,
      attemptNumber: payload.attemptNumber,
      hintLevel: payload.hintLevel,
    });

    const nextXp = state.xp + gainedXp;
    const nextLevel = calculateLevelFromXp(nextXp);
    const nextCompletedMissionSlugs = state.completedMissionSlugs.includes(payload.missionSlug)
      ? state.completedMissionSlugs
      : [...state.completedMissionSlugs, payload.missionSlug];
    const nextStreak = calculateNextStreak(state.lastMissionPassDate, nowIso, state.streakDays);

    const nextAchievements = computeAchievements({
      completedMissionCount: nextCompletedMissionSlugs.length,
      streakDays: nextStreak,
      completedTrackSlugs: payload.completedTrackSlugs ?? [],
    });

    set({
      xp: nextXp,
      level: nextLevel,
      streakDays: nextStreak,
      lastMissionPassDate: nowIso,
      completedMissionSlugs: nextCompletedMissionSlugs,
      unlockedAchievements: Array.from(new Set([...state.unlockedAchievements, ...nextAchievements])),
    });

    return gainedXp;
  },
  addCompletedMission: (missionSlug) =>
    set((state) => ({
      completedMissionSlugs: state.completedMissionSlugs.includes(missionSlug)
        ? state.completedMissionSlugs
        : [...state.completedMissionSlugs, missionSlug],
    })),
  setProgressSummary: ({ xp, level, streakDays }) => set({ xp, level, streakDays }),
}));
