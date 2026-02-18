import { create } from 'zustand';
type UiState = {
    leftPanelOpen: boolean;
    rightPanelOpen: boolean;
    setLeftPanelOpen: (open: boolean) => void;
    setRightPanelOpen: (open: boolean) => void;
    toggleRightPanel: () => void;
};
export const useUiStore = create<UiState>((set) => ({
    leftPanelOpen: true,
    rightPanelOpen: true,
    setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
    setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
    toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}));
