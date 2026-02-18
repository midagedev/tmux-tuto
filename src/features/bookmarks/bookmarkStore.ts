import { create } from 'zustand';
import { getNoteByBookmark, listBookmarks, removeBookmark, saveBookmark, saveNote, } from '../storage/repository';
import type { BookmarkRecord, NoteRecord } from '../storage/types';
function nowIso() {
    return new Date().toISOString();
}
function createId(prefix: string) {
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    return `${prefix}-${random.slice(0, 8)}`;
}
export type NewBookmarkInput = {
    type: BookmarkRecord['type'];
    targetId: string;
    title: string;
    tags: string[];
};
type BookmarkState = {
    bookmarks: BookmarkRecord[];
    notesByBookmarkId: Record<string, string>;
    loading: boolean;
    loadBookmarks: () => Promise<void>;
    createBookmark: (payload: NewBookmarkInput) => Promise<void>;
    deleteBookmark: (bookmarkId: string) => Promise<void>;
    saveBookmarkNote: (bookmarkId: string, markdown: string) => Promise<void>;
};
export const useBookmarkStore = create<BookmarkState>((set, get) => ({
    bookmarks: [],
    notesByBookmarkId: {},
    loading: false,
    loadBookmarks: async () => {
        set({ loading: true });
        const bookmarks = await listBookmarks();
        const notesEntries = await Promise.all(bookmarks.map(async (bookmark) => {
            const note = await getNoteByBookmark(bookmark.id);
            return [bookmark.id, note?.markdown ?? ''] as const;
        }));
        const notesByBookmarkId = Object.fromEntries(notesEntries);
        set({
            bookmarks: bookmarks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            notesByBookmarkId,
            loading: false,
        });
    },
    createBookmark: async ({ type, targetId, title, tags }) => {
        const bookmark: BookmarkRecord = {
            id: createId('bookmark'),
            type,
            targetId,
            title,
            tags,
            createdAt: nowIso(),
            updatedAt: nowIso(),
        };
        await saveBookmark(bookmark);
        await get().loadBookmarks();
    },
    deleteBookmark: async (bookmarkId) => {
        await removeBookmark(bookmarkId);
        await get().loadBookmarks();
    },
    saveBookmarkNote: async (bookmarkId, markdown) => {
        const note: NoteRecord = {
            id: `note-${bookmarkId}`,
            bookmarkId,
            markdown,
            updatedAt: nowIso(),
        };
        await saveNote(note);
        set((state) => ({
            notesByBookmarkId: {
                ...state.notesByBookmarkId,
                [bookmarkId]: markdown,
            },
        }));
    },
}));
