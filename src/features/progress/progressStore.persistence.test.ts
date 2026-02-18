import { beforeEach, describe, expect, it } from 'vitest';
import { createJSONStorage } from 'zustand/middleware';
import { createInitialProgressSnapshot, useProgressStore } from './progressStore';

class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

function getPersistApi() {
  return (useProgressStore as typeof useProgressStore & {
    persist: {
      clearStorage: () => Promise<void> | void;
      getOptions: () => {
        name: string;
        partialize?: (state: ReturnType<typeof useProgressStore.getState>) => unknown;
      };
      setOptions: (options: {
        storage: ReturnType<typeof createJSONStorage>;
      }) => void;
    };
  }).persist;
}

describe('progressStore persistence', () => {
  beforeEach(async () => {
    const localStorageMock = new LocalStorageMock();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    const persistApi = getPersistApi();
    persistApi.setOptions({
      storage: createJSONStorage(() => localStorageMock),
    });
    await persistApi.clearStorage();
    useProgressStore.setState(createInitialProgressSnapshot());
  });

  it('stores only progress payload fields via partialize', () => {
    const missionPass = useProgressStore.getState().recordMissionPass;

    missionPass({
      missionSlug: 'hello-tmux-version-check',
      difficulty: 'beginner',
      hintLevel: 0,
      attemptNumber: 1,
      nowIso: '2026-02-18T09:00:00.000Z',
      completedTrackSlugs: ['track-a-foundations'],
    });

    const options = getPersistApi().getOptions();
    const partialized = options.partialize?.(useProgressStore.getState()) as Record<string, unknown>;

    expect(partialized).toMatchObject({
      xp: 50,
      level: 1,
      streakDays: 1,
      completedMissionSlugs: ['hello-tmux-version-check'],
      completedTrackSlugs: ['track-a-foundations'],
      missionSessions: [
        expect.objectContaining({
          missionSlug: 'hello-tmux-version-check',
          status: 'completed',
        }),
      ],
    });
    expect(partialized).not.toHaveProperty('recordMissionPass');
    expect(partialized).not.toHaveProperty('recordTmuxActivity');
  });

  it('uses dedicated progress storage key', () => {
    const options = getPersistApi().getOptions();
    expect(options.name).toBe('tmux_tuto_progress_v1');
  });
});
