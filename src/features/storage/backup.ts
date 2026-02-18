import { normalizeBackupPayload, type BackupPayload } from './backupSchema';
import { clearAllData, setBackupMeta } from './repository';
import { getDb } from './db';
type ImportMode = 'merge' | 'replace';
export async function exportAllData(appVersion = '0.0.0'): Promise<BackupPayload> {
    const db = await getDb();
    const snapshots = await db.getAll('simulator_snapshots');
    const latestSnapshot = [...snapshots].sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
    const payload: BackupPayload = {
        backup_format_version: 2,
        exported_at: new Date().toISOString(),
        app_version: appVersion,
        simulator_defaults: {
            latestSnapshotId: latestSnapshot?.id ?? null,
            snapshotSchemaVersion: 2,
        },
        stores: {
            profile: await db.getAll('profile'),
            progress: await db.getAll('progress'),
            mission_attempts: await db.getAll('mission_attempts'),
            bookmarks: await db.getAll('bookmarks'),
            notes: await db.getAll('notes'),
            achievements: await db.getAll('achievements'),
            simulator_snapshots: snapshots,
            backup_meta: await db.getAll('backup_meta'),
        },
    };
    return payload;
}
export async function importAllData(rawPayload: unknown, mode: ImportMode) {
    const parsed = normalizeBackupPayload(rawPayload);
    const db = await getDb();
    if (mode === 'replace') {
        await clearAllData();
    }
    const tx = db.transaction([
        'profile',
        'progress',
        'mission_attempts',
        'bookmarks',
        'notes',
        'achievements',
        'simulator_snapshots',
        'backup_meta',
    ], 'readwrite');
    await Promise.all(parsed.stores.profile.map((row) => tx.objectStore('profile').put(row)));
    await Promise.all(parsed.stores.progress.map((row) => tx.objectStore('progress').put(row)));
    await Promise.all(parsed.stores.mission_attempts.map((row) => tx.objectStore('mission_attempts').put(row)));
    await Promise.all(parsed.stores.bookmarks.map((row) => tx.objectStore('bookmarks').put(row)));
    await Promise.all(parsed.stores.notes.map((row) => tx.objectStore('notes').put(row)));
    await Promise.all(parsed.stores.achievements.map((row) => tx.objectStore('achievements').put(row)));
    await Promise.all(parsed.stores.simulator_snapshots.map((row) => tx.objectStore('simulator_snapshots').put(row)));
    await Promise.all(parsed.stores.backup_meta.map((row) => tx.objectStore('backup_meta').put(row)));
    await tx.done;
    await setBackupMeta({
        key: 'last_import',
        value: parsed.exported_at,
        updatedAt: new Date().toISOString(),
    });
}
export async function resetAllData() {
    await clearAllData();
    await setBackupMeta({
        key: 'last_reset',
        value: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
}
