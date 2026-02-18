import { create } from 'zustand';
import { createInitialSimulatorState, type SimulatorMode, type SimulatorState } from './model';
import { simulatorReducer, type FocusDirection, type SimulatorAction, type SplitDirection } from './reducer';
import { resolveSimulatorInput } from './input';
import { getLatestSnapshot, getSnapshot, saveSnapshot as saveSnapshotRecord } from '../storage/repository';
import type { AppMission } from '../curriculum/contentSchema';
import { createMissionScenarioState } from './scenarioEngine';
import { resolveQuickPreset } from './quickPresets';

const MODE_VALUES: SimulatorMode[] = ['NORMAL', 'PREFIX_PENDING', 'COMMAND_MODE', 'COPY_MODE', 'SEARCH_MODE'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSimulatorStateV2(value: unknown): value is SimulatorState {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.scenarioPresetId !== 'string') {
    return false;
  }

  const shell = value.shell;
  const tmux = value.tmux;
  const mode = value.mode;

  if (!isRecord(shell) || !Array.isArray(shell.sessions) || typeof shell.activeSessionId !== 'string') {
    return false;
  }

  if (!isRecord(tmux) || !Array.isArray(tmux.sessions) || typeof tmux.activeSessionId !== 'string') {
    return false;
  }

  if (
    !isRecord(tmux.config) ||
    (tmux.config.prefixKey !== 'C-b' && tmux.config.prefixKey !== 'C-a') ||
    typeof tmux.config.mouse !== 'boolean' ||
    (tmux.config.modeKeys !== 'vi' && tmux.config.modeKeys !== 'emacs') ||
    !isRecord(tmux.config.binds) ||
    !Object.values(tmux.config.binds).every((value) => typeof value === 'string') ||
    (tmux.config.lastAppliedSource !== null && typeof tmux.config.lastAppliedSource !== 'string') ||
    !Array.isArray(tmux.config.errors) ||
    !tmux.config.errors.every((value) => typeof value === 'string')
  ) {
    return false;
  }

  if (
    !isRecord(mode) ||
    !MODE_VALUES.includes(mode.value as SimulatorMode) ||
    (mode.prefixEnteredAt !== null && typeof mode.prefixEnteredAt !== 'number') ||
    (mode.repeatUntil !== null && typeof mode.repeatUntil !== 'number') ||
    typeof mode.commandBuffer !== 'string' ||
    typeof mode.commandCursor !== 'number' ||
    (mode.historyIndex !== null && typeof mode.historyIndex !== 'number') ||
    typeof mode.historyDraft !== 'string'
  ) {
    return false;
  }

  if (
    !isRecord(mode.copyMode) ||
    typeof mode.copyMode.searchQuery !== 'string' ||
    typeof mode.copyMode.searchExecuted !== 'boolean' ||
    typeof mode.copyMode.lastMatchFound !== 'boolean' ||
    !Array.isArray(mode.copyMode.matchLineIndices) ||
    !mode.copyMode.matchLineIndices.every((item) => typeof item === 'number') ||
    typeof mode.copyMode.activeMatchIndex !== 'number'
  ) {
    return false;
  }

  if (!Array.isArray(value.messages) || !value.messages.every((item) => typeof item === 'string')) {
    return false;
  }

  if (!Array.isArray(value.actionHistory) || !value.actionHistory.every((item) => typeof item === 'string')) {
    return false;
  }

  return true;
}

function applyActions(state: SimulatorState, actions: SimulatorAction[]) {
  if (actions.length === 0) {
    return state;
  }

  return actions.reduce(simulatorReducer, state);
}

type SimulatorStore = {
  state: SimulatorState;
  dispatch: (action: SimulatorAction) => void;
  handleKeyInput: (key: string) => void;
  applyQuickPreset: (presetId: string) => void;
  initScenario: (scenarioPresetId: string) => void;
  initMissionScenario: (mission: AppMission) => void;
  setPrefixKey: (key: 'C-b' | 'C-a') => void;
  setMode: (mode: SimulatorMode) => void;
  setCommandBuffer: (command: string) => void;
  splitPane: (direction: SplitDirection) => void;
  focusPaneById: (paneId: string) => void;
  focusPane: (direction: FocusDirection) => void;
  scrollPane: (paneId: string, delta: number) => void;
  resizePane: (axis: 'x' | 'y', delta: number) => void;
  newWindow: () => void;
  nextWindow: () => void;
  prevWindow: () => void;
  newSession: () => void;
  enterCopyMode: () => void;
  exitCopyMode: () => void;
  runCopySearch: (query: string) => void;
  loadSnapshot: (snapshot: SimulatorState) => void;
  saveSnapshotToStorage: () => Promise<void>;
  restoreSnapshotByIdFromStorage: (snapshotId: string) => Promise<void>;
  restoreLatestSnapshotFromStorage: () => Promise<void>;
  reset: () => void;
};

export const useSimulatorStore = create<SimulatorStore>((set) => ({
  state: createInitialSimulatorState(),
  dispatch: (action) =>
    set((current) => ({
      state: simulatorReducer(current.state, action),
    })),
  handleKeyInput: (key) =>
    set((current) => {
      const actions = resolveSimulatorInput(current.state, key);
      return { state: applyActions(current.state, actions) };
    }),
  applyQuickPreset: (presetId) =>
    set((current) => {
      let nextState = simulatorReducer(current.state, { type: 'RESET' });
      const preset = resolveQuickPreset(presetId);
      if (!preset) {
        nextState = applyActions(nextState, [{ type: 'ADD_MESSAGE', payload: `No preset found for ${presetId}` }]);
      } else {
        nextState = applyActions(nextState, preset.actions);
        nextState = applyActions(nextState, [
          { type: 'ADD_MESSAGE', payload: `Quick preset applied (${presetId})` },
          { type: 'RECORD_ACTION', payload: `sim.preset.${preset.id}` },
        ]);
      }

      return { state: nextState };
    }),
  initScenario: (scenarioPresetId) =>
    set((current) => ({
      state: simulatorReducer(current.state, {
        type: 'INIT_SCENARIO',
        payload: scenarioPresetId,
      }),
    })),
  initMissionScenario: (mission) =>
    set(() => ({
      state: createMissionScenarioState(mission),
    })),
  setPrefixKey: (key) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'SET_PREFIX_KEY', payload: key }),
    })),
  setMode: (mode) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'SET_MODE', payload: mode }),
    })),
  setCommandBuffer: (command) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'SET_COMMAND_BUFFER', payload: command }),
    })),
  splitPane: (direction) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'SPLIT_PANE', payload: direction }),
    })),
  focusPaneById: (paneId) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'SET_ACTIVE_PANE', payload: paneId }),
    })),
  focusPane: (direction) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'FOCUS_PANE', payload: direction }),
    })),
  scrollPane: (paneId, delta) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'SCROLL_PANE', payload: { paneId, delta } }),
    })),
  resizePane: (axis, delta) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'RESIZE_PANE', payload: { axis, delta } }),
    })),
  newWindow: () =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'NEW_WINDOW' }),
    })),
  nextWindow: () =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'NEXT_WINDOW' }),
    })),
  prevWindow: () =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'PREV_WINDOW' }),
    })),
  newSession: () =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'NEW_SESSION' }),
    })),
  enterCopyMode: () =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'ENTER_COPY_MODE' }),
    })),
  exitCopyMode: () =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'EXIT_COPY_MODE' }),
    })),
  runCopySearch: (query) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'RUN_COPY_SEARCH', payload: query }),
    })),
  loadSnapshot: (snapshot) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'LOAD_SNAPSHOT', payload: snapshot }),
    })),
  saveSnapshotToStorage: async () => {
    const snapshot = useSimulatorStore.getState().state;
    const id = `snapshot-${Date.now()}`;
    await saveSnapshotRecord({
      id,
      schemaVersion: 2,
      mode: snapshot.mode.value,
      sessionGraph: {
        schemaVersion: 2,
        simulatorState: snapshot,
      },
      savedAt: new Date().toISOString(),
    });

    set((current) => ({
      state: simulatorReducer(current.state, {
        type: 'ADD_MESSAGE',
        payload: `Snapshot saved (${id})`,
      }),
    }));
  },
  restoreSnapshotByIdFromStorage: async (snapshotId) => {
    const snapshot = await getSnapshot(snapshotId);
    if (!snapshot) {
      set((current) => ({
        state: simulatorReducer(current.state, {
          type: 'ADD_MESSAGE',
          payload: `Snapshot not found (${snapshotId})`,
        }),
      }));
      return;
    }

    if (snapshot.schemaVersion !== 2) {
      set((current) => ({
        state: simulatorReducer(current.state, {
          type: 'ADD_MESSAGE',
          payload: `Unsupported snapshot schema version (${snapshot.schemaVersion})`,
        }),
      }));
      return;
    }

    const simulatorSnapshot = snapshot.sessionGraph.simulatorState;
    if (!isSimulatorStateV2(simulatorSnapshot)) {
      set((current) => ({
        state: simulatorReducer(current.state, {
          type: 'ADD_MESSAGE',
          payload: `Snapshot ${snapshot.id} is not simulator schema v2`,
        }),
      }));
      return;
    }

    set((current) => ({
      state: simulatorReducer(current.state, {
        type: 'LOAD_SNAPSHOT',
        payload: simulatorSnapshot,
      }),
    }));
  },
  restoreLatestSnapshotFromStorage: async () => {
    const latest = await getLatestSnapshot();
    const sessionGraph = latest?.sessionGraph;
    if (
      latest?.schemaVersion !== 2 ||
      !isRecord(sessionGraph) ||
      sessionGraph.schemaVersion !== 2 ||
      !isSimulatorStateV2(sessionGraph.simulatorState)
    ) {
      set((current) => ({
        state: simulatorReducer(current.state, {
          type: 'ADD_MESSAGE',
          payload: 'No v2 restorable snapshot found',
        }),
      }));
      return;
    }

    const simulatorSnapshot = sessionGraph.simulatorState;
    set((current) => ({
      state: simulatorReducer(current.state, {
        type: 'LOAD_SNAPSHOT',
        payload: simulatorSnapshot,
      }),
    }));
  },
  reset: () =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'RESET' }),
    })),
}));
