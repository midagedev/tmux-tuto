import { beforeEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { DB_NAME, getDb, resetDbForTests } from './db';

describe('storage migrations', () => {
  beforeEach(async () => {
    await resetDbForTests();
  });

  it('adds snapshot schemaVersion index when upgrading from v2 to v3', async () => {
    const v2db = await openDB(DB_NAME, 2, {
      upgrade(db) {
        const snapshotStore = db.createObjectStore('simulator_snapshots', { keyPath: 'id' });
        snapshotStore.createIndex('by-savedAt', 'savedAt');
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
