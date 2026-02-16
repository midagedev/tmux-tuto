import { getDb } from './db';
import type {
  AchievementRecord,
  BackupMetaRecord,
  BookmarkRecord,
  MissionAttemptRecord,
  NoteRecord,
  ProfileRecord,
  ProgressRecord,
  SimulatorSnapshotRecord,
} from './types';

const STORE_NAMES = [
  'profile',
  'progress',
  'mission_attempts',
  'bookmarks',
  'notes',
  'achievements',
  'simulator_snapshots',
  'backup_meta',
] as const;

type StoreName = (typeof STORE_NAMES)[number];

export async function getProfile() {
  const db = await getDb();
  return db.get('profile', 'me');
}

export async function saveProfile(profile: ProfileRecord) {
  const db = await getDb();
  await db.put('profile', profile);
}

export async function getProgress(lessonId: string) {
  const db = await getDb();
  return db.get('progress', lessonId);
}

export async function saveProgress(progress: ProgressRecord) {
  const db = await getDb();
  await db.put('progress', progress);
}

export async function listProgress() {
  const db = await getDb();
  return db.getAll('progress');
}

export async function appendMissionAttempt(attempt: MissionAttemptRecord) {
  const db = await getDb();
  return db.add('mission_attempts', attempt);
}

export async function listMissionAttempts(missionSlug?: string) {
  const db = await getDb();
  if (!missionSlug) {
    return db.getAll('mission_attempts');
  }

  return db.getAllFromIndex('mission_attempts', 'by-missionSlug', missionSlug);
}

export async function saveBookmark(bookmark: BookmarkRecord) {
  const db = await getDb();
  await db.put('bookmarks', bookmark);
}

export async function removeBookmark(bookmarkId: string) {
  const db = await getDb();
  await db.delete('bookmarks', bookmarkId);
}

export async function listBookmarks() {
  const db = await getDb();
  return db.getAll('bookmarks');
}

export async function saveNote(note: NoteRecord) {
  const db = await getDb();
  await db.put('notes', note);
}

export async function getNoteByBookmark(bookmarkId: string) {
  const db = await getDb();
  const notes = await db.getAllFromIndex('notes', 'by-bookmarkId', bookmarkId);
  return notes[0];
}

export async function saveAchievement(achievement: AchievementRecord) {
  const db = await getDb();
  await db.put('achievements', achievement);
}

export async function listAchievements() {
  const db = await getDb();
  return db.getAll('achievements');
}

export async function saveSnapshot(snapshot: SimulatorSnapshotRecord) {
  const db = await getDb();
  await db.put('simulator_snapshots', snapshot);
}

export async function getSnapshot(snapshotId: string) {
  const db = await getDb();
  return db.get('simulator_snapshots', snapshotId);
}

export async function getLatestSnapshot() {
  const db = await getDb();
  const allSnapshots = await db.getAll('simulator_snapshots');
  return allSnapshots.sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
}

export async function setBackupMeta(meta: BackupMetaRecord) {
  const db = await getDb();
  await db.put('backup_meta', meta);
}

export async function getBackupMeta(key: string) {
  const db = await getDb();
  return db.get('backup_meta', key);
}

export async function clearAllData() {
  const db = await getDb();
  const tx = db.transaction([...STORE_NAMES], 'readwrite');
  await Promise.all(
    STORE_NAMES.map((storeName: StoreName) => tx.objectStore(storeName).clear()),
  );
  await tx.done;
}
