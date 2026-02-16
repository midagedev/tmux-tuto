import type { IDBPDatabase, IDBPTransaction } from 'idb';
import type { TmuxTutoDB } from './types';

type TmuxStoreName =
  | 'profile'
  | 'progress'
  | 'mission_attempts'
  | 'bookmarks'
  | 'notes'
  | 'achievements'
  | 'simulator_snapshots'
  | 'backup_meta';

export type MigrationTx = IDBPTransaction<TmuxTutoDB, ArrayLike<TmuxStoreName>, 'versionchange'>;

export type MigrationContext = {
  db: IDBPDatabase<TmuxTutoDB>;
  tx: MigrationTx;
};

export type MigrationFn = (context: MigrationContext) => void;

function migrationV1({ db }: MigrationContext) {
  if (!db.objectStoreNames.contains('profile')) {
    db.createObjectStore('profile', { keyPath: 'id' });
  }

  if (!db.objectStoreNames.contains('progress')) {
    const progressStore = db.createObjectStore('progress', { keyPath: 'lessonId' });
    progressStore.createIndex('by-updatedAt', 'updatedAt');
    progressStore.createIndex('by-status', 'status');
  }

  if (!db.objectStoreNames.contains('mission_attempts')) {
    const attemptStore = db.createObjectStore('mission_attempts', {
      keyPath: 'id',
      autoIncrement: true,
    });
    attemptStore.createIndex('by-missionSlug', 'missionSlug');
    attemptStore.createIndex('by-createdAt', 'createdAt');
  }

  if (!db.objectStoreNames.contains('bookmarks')) {
    const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
    bookmarkStore.createIndex('by-type', 'type');
    bookmarkStore.createIndex('by-createdAt', 'createdAt');
  }

  if (!db.objectStoreNames.contains('notes')) {
    const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
    noteStore.createIndex('by-bookmarkId', 'bookmarkId');
    noteStore.createIndex('by-updatedAt', 'updatedAt');
  }

  if (!db.objectStoreNames.contains('achievements')) {
    const achievementStore = db.createObjectStore('achievements', { keyPath: 'id' });
    achievementStore.createIndex('by-unlockedAt', 'unlockedAt');
  }

  if (!db.objectStoreNames.contains('simulator_snapshots')) {
    const snapshotStore = db.createObjectStore('simulator_snapshots', { keyPath: 'id' });
    snapshotStore.createIndex('by-savedAt', 'savedAt');
  }

  if (!db.objectStoreNames.contains('backup_meta')) {
    db.createObjectStore('backup_meta', { keyPath: 'key' });
  }
}

function migrationV2({ db }: MigrationContext) {
  const hasStore = db.objectStoreNames.contains('simulator_snapshots');
  if (!hasStore) {
    const snapshotStore = db.createObjectStore('simulator_snapshots', { keyPath: 'id' });
    snapshotStore.createIndex('by-savedAt', 'savedAt');
  }
}

export const MIGRATIONS: Record<number, MigrationFn> = {
  1: migrationV1,
  2: migrationV2,
};

export function applyMigrations(
  db: IDBPDatabase<TmuxTutoDB>,
  tx: MigrationTx,
  oldVersion: number,
  newVersion: number,
) {
  for (let version = oldVersion + 1; version <= newVersion; version += 1) {
    const migrate = MIGRATIONS[version];
    if (migrate) {
      migrate({ db, tx });
    }
  }
}
