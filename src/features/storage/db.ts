import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { TmuxTutoDB } from './types';

export const DB_NAME = 'tmux_tuto';
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TmuxTutoDB>> | null = null;

function createStoreIndexes(db: IDBPDatabase<TmuxTutoDB>) {
  db.createObjectStore('profile', { keyPath: 'id' });

  const progressStore = db.createObjectStore('progress', { keyPath: 'lessonId' });
  progressStore.createIndex('by-updatedAt', 'updatedAt');
  progressStore.createIndex('by-status', 'status');

  const attemptStore = db.createObjectStore('mission_attempts', {
    keyPath: 'id',
    autoIncrement: true,
  });
  attemptStore.createIndex('by-missionSlug', 'missionSlug');
  attemptStore.createIndex('by-createdAt', 'createdAt');

  const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
  bookmarkStore.createIndex('by-type', 'type');
  bookmarkStore.createIndex('by-createdAt', 'createdAt');

  const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
  noteStore.createIndex('by-bookmarkId', 'bookmarkId');
  noteStore.createIndex('by-updatedAt', 'updatedAt');

  const achievementStore = db.createObjectStore('achievements', { keyPath: 'id' });
  achievementStore.createIndex('by-unlockedAt', 'unlockedAt');

  const snapshotStore = db.createObjectStore('simulator_snapshots', { keyPath: 'id' });
  snapshotStore.createIndex('by-savedAt', 'savedAt');

  db.createObjectStore('backup_meta', { keyPath: 'key' });
}

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TmuxTutoDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion === 0) {
          createStoreIndexes(db);
        }
      },
    });
  }

  return dbPromise;
}
