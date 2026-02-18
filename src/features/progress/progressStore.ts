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
  paneResizeCount: number;
  paneSelectCount: number;
  paneSwapCount: number;
  windowRotateCount: number;
  layoutSelectCount: number;
  zoomToggleCount: number;
  syncToggleCount: number;
  commandPromptCount: number;
  chooseTreeCount: number;
  layoutSignatures: string[];
  zoomObserved: boolean;
  syncObserved: boolean;
  lessonSlugs: string[];
};

type TmuxActivityPayload = {
  actions: string[];
  paneCount?: number | null;
  windowLayout?: string | null;
  windowZoomed?: boolean | null;
  paneSynchronized?: boolean | null;
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
  paneResizeCount: 0,
  paneSelectCount: 0,
  paneSwapCount: 0,
  windowRotateCount: 0,
  layoutSelectCount: 0,
  zoomToggleCount: 0,
  syncToggleCount: 0,
  commandPromptCount: 0,
  chooseTreeCount: 0,
  layoutSignatures: [],
  zoomObserved: false,
  syncObserved: false,
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
      layoutSignatures: [...state.tmuxSkillStats.layoutSignatures],
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
        case 'sim.pane.resize':
          nextStats.paneResizeCount += 1;
          break;
        case 'sim.pane.select':
          nextStats.paneSelectCount += 1;
          break;
        case 'sim.pane.swap':
          nextStats.paneSwapCount += 1;
          break;
        case 'sim.window.rotate':
          nextStats.windowRotateCount += 1;
          break;
        case 'sim.layout.select':
          nextStats.layoutSelectCount += 1;
          break;
        case 'sim.pane.zoom.toggle':
          nextStats.zoomToggleCount += 1;
          break;
        case 'sim.panes.sync.toggle':
          nextStats.syncToggleCount += 1;
          break;
        case 'sim.command.prompt':
          nextStats.commandPromptCount += 1;
          break;
        case 'sim.choose.tree':
          nextStats.chooseTreeCount += 1;
          break;
        default:
          break;
      }
    });

    if (typeof payload.paneCount === 'number' && payload.paneCount > nextStats.maxPaneCount) {
      nextStats.maxPaneCount = payload.paneCount;
    }

    const layout = payload.windowLayout?.trim() ?? '';
    if (layout && !nextStats.layoutSignatures.includes(layout)) {
      nextStats.layoutSignatures.push(layout);
    }

    if (payload.windowZoomed === true) {
      nextStats.zoomObserved = true;
    }

    if (payload.paneSynchronized === true) {
      nextStats.syncObserved = true;
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
      paneResizeCount: nextStats.paneResizeCount,
      paneSelectCount: nextStats.paneSelectCount,
      paneSwapCount: nextStats.paneSwapCount,
      windowRotateCount: nextStats.windowRotateCount,
      layoutSelectCount: nextStats.layoutSelectCount,
      zoomToggleCount: nextStats.zoomToggleCount,
      syncToggleCount: nextStats.syncToggleCount,
      commandPromptCount: nextStats.commandPromptCount,
      chooseTreeCount: nextStats.chooseTreeCount,
      uniqueLayoutCount: nextStats.layoutSignatures.length,
      zoomObserved: nextStats.zoomObserved,
      syncObserved: nextStats.syncObserved,
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
