import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type OnboardingGoal = 'fast-foundations' | 'shortcut-review' | 'advanced-routine';
export type KeyboardLayout = 'mac' | 'windows';
type OnboardingState = {
    startedAt: string | null;
    goal: OnboardingGoal | null;
    prefixKey: 'C-b' | 'C-a';
    keyboardLayout: KeyboardLayout;
    firstMissionPassedAt: string | null;
    completedAt: string | null;
    startOnboarding: () => void;
    setGoal: (goal: OnboardingGoal) => void;
    setPreferences: (payload: {
        prefixKey: 'C-b' | 'C-a';
        keyboardLayout: KeyboardLayout;
    }) => void;
    markFirstMissionPassed: () => void;
    completeOnboarding: () => void;
    resetOnboarding: () => void;
};
const initialState = {
    startedAt: null,
    goal: null,
    prefixKey: 'C-b' as const,
    keyboardLayout: 'mac' as const,
    firstMissionPassedAt: null,
    completedAt: null,
};
function nowIso() {
    return new Date().toISOString();
}
export const useOnboardingStore = create<OnboardingState>()(persist((set) => ({
    ...initialState,
    startOnboarding: () => set((state) => ({ startedAt: state.startedAt ?? nowIso() })),
    setGoal: (goal) => set({ goal }),
    setPreferences: ({ prefixKey, keyboardLayout }) => set({ prefixKey, keyboardLayout }),
    markFirstMissionPassed: () => set((state) => ({
        firstMissionPassedAt: state.firstMissionPassedAt ?? nowIso(),
    })),
    completeOnboarding: () => set((state) => ({
        completedAt: state.completedAt ?? nowIso(),
    })),
    resetOnboarding: () => set({ ...initialState }),
}), {
    name: 'tmux_tuto_onboarding_v1',
}));
