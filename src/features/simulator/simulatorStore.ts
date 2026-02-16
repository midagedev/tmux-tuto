import { create } from 'zustand';
import { createInitialSimulatorState, type SimulatorState } from './model';
import { simulatorReducer, type FocusDirection, type SimulatorAction, type SplitDirection } from './reducer';
import { resolveSimulatorInput } from './input';
import { getLatestSnapshot, saveSnapshot as saveSnapshotRecord } from '../storage/repository';

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
  setPrefixKey: (key: 'C-b' | 'C-a') => void;
  setMode: (mode: SimulatorState['mode']) => void;
  setCommandBuffer: (command: string) => void;
  splitPane: (direction: SplitDirection) => void;
  focusPane: (direction: FocusDirection) => void;
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
  focusPane: (direction) =>
    set((current) => ({
      state: simulatorReducer(current.state, { type: 'FOCUS_PANE', payload: direction }),
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
      mode: snapshot.mode,
      sessionGraph: { simulatorState: snapshot },
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
    const candidate = latest?.sessionGraph?.simulatorState;
    if (!candidate || typeof candidate !== 'object') {
      set((current) => ({
        state: simulatorReducer(current.state, {
          type: 'ADD_MESSAGE',
          payload: 'No restorable snapshot found',
        }),
      }));
      return;
    }

    const simulatorSnapshot = candidate as SimulatorState;
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
