import { beforeEach, describe, expect, it } from 'vitest';
import { useProgressStore } from './progressStore';

function resetProgressStore() {
  useProgressStore.setState({
    xp: 0,
    level: 1,
    streakDays: 0,
    lastMissionPassDate: null,
    completedMissionSlugs: [],
    completedTrackSlugs: [],
    unlockedCoreAchievements: [],
    unlockedFunAchievements: [],
    unlockedAchievements: [],
    missionSessions: [],
    tmuxSkillStats: {
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
    },
  });
}

describe('progressStore', () => {
  beforeEach(() => {
    resetProgressStore();
  });

  it('does not duplicate completion achievements on repeated mission pass', () => {
    const missionPass = useProgressStore.getState().recordMissionPass;

    missionPass({
      missionSlug: 'hello-tmux-version-check',
      difficulty: 'beginner',
      hintLevel: 0,
      attemptNumber: 1,
      nowIso: '2026-02-18T10:00:00.000Z',
      completedTrackSlugs: [],
    });

    missionPass({
      missionSlug: 'hello-tmux-version-check',
      difficulty: 'beginner',
      hintLevel: 0,
      attemptNumber: 1,
      nowIso: '2026-02-18T10:10:00.000Z',
      completedTrackSlugs: [],
    });

    const state = useProgressStore.getState();
    expect(state.completedMissionSlugs).toEqual(['hello-tmux-version-check']);
    expect(state.unlockedCoreAchievements.filter((id) => id === 'first_mission_passed')).toHaveLength(1);
    expect(state.unlockedAchievements.filter((id) => id === 'first_mission_passed')).toHaveLength(1);
  });

  it('returns only newly unlocked achievements once for repeated activity events', () => {
    const recordTmuxActivity = useProgressStore.getState().recordTmuxActivity;

    const firstUnlocked = recordTmuxActivity({
      actions: [
        'sim.session.new',
        'sim.window.new',
        'sim.pane.split',
        'sim.copymode.enter',
        'sim.command.prompt',
        'sim.choose.tree',
      ],
      paneCount: 2,
      lessonSlug: 'copy-search',
    });

    const secondUnlocked = recordTmuxActivity({
      actions: [
        'sim.session.new',
        'sim.window.new',
        'sim.pane.split',
        'sim.copymode.enter',
        'sim.command.prompt',
        'sim.choose.tree',
      ],
      paneCount: 2,
      lessonSlug: 'copy-search',
    });

    expect(firstUnlocked).toContain('workspace_bootstrap');
    expect(firstUnlocked).toContain('hidden_trickster');
    expect(secondUnlocked).toEqual([]);

    const state = useProgressStore.getState();
    expect(state.unlockedAchievements.filter((id) => id === 'workspace_bootstrap')).toHaveLength(1);
    expect(state.unlockedAchievements.filter((id) => id === 'hidden_trickster')).toHaveLength(1);
  });

  it('tracks mission sessions and marks the latest in-progress session as completed on pass', () => {
    const { startMissionSession, recordMissionPass } = useProgressStore.getState();
    const sessionId = startMissionSession({
      missionSlug: 'hello-tmux-version-check',
      lessonSlug: 'hello-tmux',
      nowIso: '2026-02-18T10:00:00.000Z',
    });

    expect(sessionId).toBeTruthy();
    expect(useProgressStore.getState().missionSessions).toEqual([
      {
        id: sessionId,
        missionSlug: 'hello-tmux-version-check',
        lessonSlug: 'hello-tmux',
        status: 'in_progress',
        startedAt: '2026-02-18T10:00:00.000Z',
        completedAt: null,
        gainedXp: null,
      },
    ]);

    const gainedXp = recordMissionPass({
      missionSlug: 'hello-tmux-version-check',
      difficulty: 'beginner',
      hintLevel: 0,
      attemptNumber: 1,
      nowIso: '2026-02-18T10:05:00.000Z',
    });

    const state = useProgressStore.getState();
    expect(gainedXp).toBe(50);
    expect(state.missionSessions).toEqual([
      {
        id: sessionId,
        missionSlug: 'hello-tmux-version-check',
        lessonSlug: 'hello-tmux',
        status: 'completed',
        startedAt: '2026-02-18T10:00:00.000Z',
        completedAt: '2026-02-18T10:05:00.000Z',
        gainedXp: 50,
      },
    ]);
  });

  it('does not create duplicate in-progress sessions for the same mission', () => {
    const { startMissionSession } = useProgressStore.getState();

    const first = startMissionSession({
      missionSlug: 'session-create',
      lessonSlug: 'basics',
      nowIso: '2026-02-18T10:00:00.000Z',
    });
    const second = startMissionSession({
      missionSlug: 'session-create',
      lessonSlug: 'basics',
      nowIso: '2026-02-18T10:01:00.000Z',
    });

    expect(first).toBe(second);
    expect(useProgressStore.getState().missionSessions).toHaveLength(1);
  });
});
