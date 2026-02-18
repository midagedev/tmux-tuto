import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  calculateLevelFromXp,
  calculateMissionXp,
  calculateNextStreak,
  computeCoreAchievements,
  computeFunAchievements,
  type AchievementEvaluationInput,
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

export type TmuxSkillStats = {
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

export type ProgressState = {
  xp: number;
  level: number;
  streakDays: number;
  lastMissionPassDate: string | null;
  completedMissionSlugs: string[];
  completedTrackSlugs: string[];
  unlockedCoreAchievements: string[];
  unlockedFunAchievements: string[];
  unlockedAchievements: string[];
  tmuxSkillStats: TmuxSkillStats;
  recordMissionPass: (payload: MissionPassPayload) => number;
  recordTmuxActivity: (payload: TmuxActivityPayload) => string[];
  addCompletedMission: (missionSlug: string) => void;
  setProgressSummary: (payload: { xp: number; level: number; streakDays: number }) => void;
};

type PersistedProgressSlice = Pick<
  ProgressState,
  | 'xp'
  | 'level'
  | 'streakDays'
  | 'lastMissionPassDate'
  | 'completedMissionSlugs'
  | 'completedTrackSlugs'
  | 'unlockedCoreAchievements'
  | 'unlockedFunAchievements'
  | 'unlockedAchievements'
  | 'tmuxSkillStats'
>;

const PROGRESS_PERSIST_KEY = 'tmux_tuto_progress_v1';

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

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const progressStorage = createJSONStorage<PersistedProgressSlice>(() => {
  const maybeLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  if (!maybeLocalStorage) {
    return noopStorage;
  }
  return maybeLocalStorage;
});

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function createInitialProgressSnapshot(): PersistedProgressSlice {
  return {
    xp: 0,
    level: 1,
    streakDays: 0,
    lastMissionPassDate: null,
    completedMissionSlugs: [],
    completedTrackSlugs: [],
    unlockedCoreAchievements: [],
    unlockedFunAchievements: [],
    unlockedAchievements: [],
    tmuxSkillStats: { ...INITIAL_TMUX_SKILL_STATS },
  };
}

function buildAchievementInput(
  completedMissionSlugs: string[],
  completedTrackSlugs: string[],
  streakDays: number,
  tmuxSkillStats: TmuxSkillStats,
): AchievementEvaluationInput {
  return {
    completedMissionCount: completedMissionSlugs.length,
    streakDays,
    completedTrackSlugs,
    splitCount: tmuxSkillStats.splitCount,
    newWindowCount: tmuxSkillStats.newWindowCount,
    newSessionCount: tmuxSkillStats.newSessionCount,
    copyModeCount: tmuxSkillStats.copyModeCount,
    paneResizeCount: tmuxSkillStats.paneResizeCount,
    paneSelectCount: tmuxSkillStats.paneSelectCount,
    layoutSelectCount: tmuxSkillStats.layoutSelectCount,
    commandPromptCount: tmuxSkillStats.commandPromptCount,
    chooseTreeCount: tmuxSkillStats.chooseTreeCount,
    uniqueLayoutCount: tmuxSkillStats.layoutSignatures.length,
    lessonCount: tmuxSkillStats.lessonSlugs.length,
  };
}

function mergeAchievementState(
  state: Pick<ProgressState, 'unlockedCoreAchievements' | 'unlockedFunAchievements' | 'unlockedAchievements'>,
  input: AchievementEvaluationInput,
) {
  const computedCore = computeCoreAchievements(input);
  const computedFun = computeFunAchievements(input);

  const unlockedCoreAchievements = unique([...state.unlockedCoreAchievements, ...computedCore]);
  const unlockedFunAchievements = unique([...state.unlockedFunAchievements, ...computedFun]);
  const unlockedAchievements = unique([
    ...state.unlockedAchievements,
    ...unlockedCoreAchievements,
    ...unlockedFunAchievements,
  ]);

  const newlyUnlocked = unlockedAchievements.filter((achievement) => !state.unlockedAchievements.includes(achievement));

  return {
    unlockedCoreAchievements,
    unlockedFunAchievements,
    unlockedAchievements,
    newlyUnlocked,
  };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...createInitialProgressSnapshot(),
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
        const nextCompletedTrackSlugs = unique([...state.completedTrackSlugs, ...(payload.completedTrackSlugs ?? [])]);

        const achievementInput = buildAchievementInput(
          nextCompletedMissionSlugs,
          nextCompletedTrackSlugs,
          nextStreak,
          state.tmuxSkillStats,
        );
        const nextAchievementState = mergeAchievementState(state, achievementInput);

        set({
          xp: nextXp,
          level: nextLevel,
          streakDays: nextStreak,
          lastMissionPassDate: nowIso,
          completedMissionSlugs: nextCompletedMissionSlugs,
          completedTrackSlugs: nextCompletedTrackSlugs,
          unlockedCoreAchievements: nextAchievementState.unlockedCoreAchievements,
          unlockedFunAchievements: nextAchievementState.unlockedFunAchievements,
          unlockedAchievements: nextAchievementState.unlockedAchievements,
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

        const achievementInput = buildAchievementInput(
          state.completedMissionSlugs,
          state.completedTrackSlugs,
          state.streakDays,
          nextStats,
        );

        const nextAchievementState = mergeAchievementState(state, achievementInput);

        set({
          tmuxSkillStats: nextStats,
          unlockedCoreAchievements: nextAchievementState.unlockedCoreAchievements,
          unlockedFunAchievements: nextAchievementState.unlockedFunAchievements,
          unlockedAchievements: nextAchievementState.unlockedAchievements,
        });

        return nextAchievementState.newlyUnlocked;
      },
      addCompletedMission: (missionSlug) =>
        set((state) => ({
          completedMissionSlugs: state.completedMissionSlugs.includes(missionSlug)
            ? state.completedMissionSlugs
            : [...state.completedMissionSlugs, missionSlug],
        })),
      setProgressSummary: ({ xp, level, streakDays }) => set({ xp, level, streakDays }),
    }),
    {
      name: PROGRESS_PERSIST_KEY,
      version: 1,
      storage: progressStorage,
      partialize: (state) => ({
        xp: state.xp,
        level: state.level,
        streakDays: state.streakDays,
        lastMissionPassDate: state.lastMissionPassDate,
        completedMissionSlugs: state.completedMissionSlugs,
        completedTrackSlugs: state.completedTrackSlugs,
        unlockedCoreAchievements: state.unlockedCoreAchievements,
        unlockedFunAchievements: state.unlockedFunAchievements,
        unlockedAchievements: state.unlockedAchievements,
        tmuxSkillStats: state.tmuxSkillStats,
      }),
    },
  ),
);
