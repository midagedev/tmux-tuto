import { create } from 'zustand';

type SimulatorMode = 'NORMAL' | 'PREFIX_PENDING' | 'COMMAND_MODE' | 'COPY_MODE' | 'SEARCH_MODE';

type SimulatorState = {
  mode: SimulatorMode;
  prefixKey: 'C-b' | 'C-a';
  actionHistory: string[];
  setMode: (mode: SimulatorMode) => void;
  setPrefixKey: (key: 'C-b' | 'C-a') => void;
  recordAction: (actionId: string) => void;
  clearHistory: () => void;
};

export const useSimulatorStore = create<SimulatorState>((set) => ({
  mode: 'NORMAL',
  prefixKey: 'C-b',
  actionHistory: [],
  setMode: (mode) => set({ mode }),
  setPrefixKey: (prefixKey) => set({ prefixKey }),
  recordAction: (actionId) =>
    set((state) => ({ actionHistory: [...state.actionHistory.slice(-49), actionId] })),
  clearHistory: () => set({ actionHistory: [] }),
}));
