import { create } from 'zustand';

type CurriculumState = {
  contentVersion: string;
  selectedTrackSlug: string | null;
  selectedLessonSlug: string | null;
  setContentVersion: (version: string) => void;
  setSelectedTrack: (trackSlug: string | null) => void;
  setSelectedLesson: (lessonSlug: string | null) => void;
};

export const useCurriculumStore = create<CurriculumState>((set) => ({
  contentVersion: '0.0.0',
  selectedTrackSlug: null,
  selectedLessonSlug: null,
  setContentVersion: (contentVersion) => set({ contentVersion }),
  setSelectedTrack: (selectedTrackSlug) => set({ selectedTrackSlug }),
  setSelectedLesson: (selectedLessonSlug) => set({ selectedLessonSlug }),
}));
