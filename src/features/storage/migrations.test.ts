import { beforeEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { applyMigrations, type MigrationTx } from './migrations';
import { DB_NAME, getDb, resetDbForTests } from './db';
import type { TmuxTutoDB } from './types';

describe('storage migrations', () => {
  beforeEach(async () => {
    await resetDbForTests();
  });

  it('adds snapshot schemaVersion index when upgrading from v2 to v3', async () => {
    const v2db = await openDB<TmuxTutoDB>(DB_NAME, 2, {
      upgrade(db, oldVersion, newVersion, tx) {
        applyMigrations(db, tx as unknown as MigrationTx, oldVersion, newVersion ?? 2);
      },
    });
    v2db.close();

    const db = await getDb();
    const tx = db.transaction('simulator_snapshots', 'readonly');
    const snapshotStore = tx.objectStore('simulator_snapshots');

    expect(snapshotStore.indexNames.contains('by-schemaVersion')).toBe(true);

    await tx.done;
  });
});
