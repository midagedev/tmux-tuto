import { create } from 'zustand';
import {
  calculateLevelFromXp,
  calculateMissionXp,
  calculateNextStreak,
  computeCourseAchievements,
  computeSkillAchievements,
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

type TmuxSkillStats = {
  splitCount: number;
  maxPaneCount: number;
  newWindowCount: number;
  newSessionCount: number;
  copyModeCount: number;
  lessonSlugs: string[];
};

type TmuxActivityPayload = {
  actions: string[];
  paneCount?: number | null;
  lessonSlug?: string | null;
};

type ProgressState = {
  xp: number;
  level: number;
  streakDays: number;
  lastMissionPassDate: string | null;
  completedMissionSlugs: string[];
  unlockedCourseAchievements: string[];
  unlockedSkillAchievements: string[];
  unlockedAchievements: string[];
  tmuxSkillStats: TmuxSkillStats;
  recordMissionPass: (payload: MissionPassPayload) => number;
  recordTmuxActivity: (payload: TmuxActivityPayload) => string[];
  addCompletedMission: (missionSlug: string) => void;
  setProgressSummary: (payload: { xp: number; level: number; streakDays: number }) => void;
};

const INITIAL_TMUX_SKILL_STATS: TmuxSkillStats = {
  splitCount: 0,
  maxPaneCount: 1,
  newWindowCount: 0,
  newSessionCount: 0,
  copyModeCount: 0,
  lessonSlugs: [],
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  xp: 0,
  level: 1,
  streakDays: 0,
  lastMissionPassDate: null,
  completedMissionSlugs: [],
  unlockedCourseAchievements: [],
  unlockedSkillAchievements: [],
  unlockedAchievements: [],
  tmuxSkillStats: INITIAL_TMUX_SKILL_STATS,
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

    const nextCourseAchievements = computeCourseAchievements({
      completedMissionCount: nextCompletedMissionSlugs.length,
      streakDays: nextStreak,
      completedTrackSlugs: payload.completedTrackSlugs ?? [],
    });

    const unlockedCourseAchievements = Array.from(
      new Set([...state.unlockedCourseAchievements, ...nextCourseAchievements]),
    );
    const unlockedAchievements = Array.from(
      new Set([...state.unlockedAchievements, ...unlockedCourseAchievements]),
    );

    set({
      xp: nextXp,
      level: nextLevel,
      streakDays: nextStreak,
      lastMissionPassDate: nowIso,
      completedMissionSlugs: nextCompletedMissionSlugs,
      unlockedCourseAchievements,
      unlockedAchievements,
    });

    return gainedXp;
  },
  recordTmuxActivity: (payload) => {
    const state = get();
    const nextStats: TmuxSkillStats = {
      ...state.tmuxSkillStats,
      lessonSlugs: [...state.tmuxSkillStats.lessonSlugs],
    };

    payload.actions.forEach((action) => {
      switch (action) {
        case 'sim.pane.split':
          nextStats.splitCount += 1;
          break;
        case 'sim.window.new':
          nextStats.newWindowCount += 1;
          break;
        case 'sim.session.new':
          nextStats.newSessionCount += 1;
          break;
        case 'sim.copymode.enter':
          nextStats.copyModeCount += 1;
          break;
        default:
          break;
      }
    });

    if (typeof payload.paneCount === 'number' && payload.paneCount > nextStats.maxPaneCount) {
      nextStats.maxPaneCount = payload.paneCount;
    }

    const lessonSlug = payload.lessonSlug?.trim() ?? '';
    if (lessonSlug && !nextStats.lessonSlugs.includes(lessonSlug)) {
      nextStats.lessonSlugs.push(lessonSlug);
    }

    const computedSkillAchievements = computeSkillAchievements({
      splitCount: nextStats.splitCount,
      maxPaneCount: nextStats.maxPaneCount,
      newWindowCount: nextStats.newWindowCount,
      newSessionCount: nextStats.newSessionCount,
      copyModeCount: nextStats.copyModeCount,
      lessonCount: nextStats.lessonSlugs.length,
    });

    const newlyUnlocked = computedSkillAchievements.filter(
      (achievement) => !state.unlockedSkillAchievements.includes(achievement),
    );

    const unlockedSkillAchievements = Array.from(
      new Set([...state.unlockedSkillAchievements, ...computedSkillAchievements]),
    );
    const unlockedAchievements = Array.from(
      new Set([
        ...state.unlockedAchievements,
        ...state.unlockedCourseAchievements,
        ...unlockedSkillAchievements,
      ]),
    );

    set({
      tmuxSkillStats: nextStats,
      unlockedSkillAchievements,
      unlockedAchievements,
    });

    return newlyUnlocked;
  },
  addCompletedMission: (missionSlug) =>
    set((state) => ({
      completedMissionSlugs: state.completedMissionSlugs.includes(missionSlug)
        ? state.completedMissionSlugs
        : [...state.completedMissionSlugs, missionSlug],
    })),
  setProgressSummary: ({ xp, level, streakDays }) => set({ xp, level, streakDays }),
}));
