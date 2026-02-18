import { create } from 'zustand';
import { createInitialSimulatorState, type SimulatorMode, type SimulatorState } from './model';
import { simulatorReducer, type FocusDirection, type SimulatorAction, type SplitDirection } from './reducer';
import { resolveSimulatorInput } from './input';
import { getLatestSnapshot, saveSnapshot as saveSnapshotRecord } from '../storage/repository';

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

  if (!isRecord(tmux.config) || (tmux.config.prefixKey !== 'C-b' && tmux.config.prefixKey !== 'C-a')) {
    return false;
  }

  if (
    !isRecord(mode) ||
    !MODE_VALUES.includes(mode.value as SimulatorMode) ||
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
    typeof mode.copyMode.lastMatchFound !== 'boolean'
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

      switch (presetId) {
        case 'cs-split-vertical':
          nextState = applyActions(nextState, [{ type: 'SPLIT_PANE', payload: 'vertical' }]);
          break;
        case 'cs-split-horizontal':
          nextState = applyActions(nextState, [{ type: 'SPLIT_PANE', payload: 'horizontal' }]);
          break;
        case 'cs-window-new':
          nextState = applyActions(nextState, [{ type: 'NEW_WINDOW' }]);
          break;
        case 'cs-window-next':
          nextState = applyActions(nextState, [
            { type: 'NEW_WINDOW' },
            { type: 'NEXT_WINDOW' },
          ]);
          break;
        case 'cs-copy-mode':
          nextState = applyActions(nextState, [{ type: 'ENTER_COPY_MODE' }]);
          break;
        case 'cs-command-mode':
          nextState = applyActions(nextState, [{ type: 'SET_MODE', payload: 'COMMAND_MODE' }]);
          break;
        case 'cs-session-main':
          nextState = applyActions(nextState, [
            { type: 'ADD_MESSAGE', payload: 'Practice preset: tmux new -As main' },
          ]);
          break;
        default:
          nextState = applyActions(nextState, [
            { type: 'ADD_MESSAGE', payload: `No preset found for ${presetId}` },
          ]);
          break;
      }

      nextState = applyActions(nextState, [
        { type: 'ADD_MESSAGE', payload: `Quick preset applied (${presetId})` },
      ]);

      return { state: nextState };
    }),
  initScenario: (scenarioPresetId) =>
    set((current) => ({
      state: simulatorReducer(current.state, {
        type: 'INIT_SCENARIO',
        payload: scenarioPresetId,
      }),
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
