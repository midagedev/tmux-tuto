import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { TmuxTutoDB } from './types';
import { applyMigrations } from './migrations';

export const DB_NAME = 'tmux_tuto';
export const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<TmuxTutoDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TmuxTutoDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        const targetVersion = newVersion ?? DB_VERSION;
        applyMigrations(db, tx, oldVersion, targetVersion);
      },
    });
  }

  return dbPromise;
}

export async function resetDbForTests() {
  if (typeof indexedDB === 'undefined') {
    dbPromise = null;
    return;
  }

  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = null;

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
