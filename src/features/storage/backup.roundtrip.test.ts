import { beforeEach, describe, expect, it } from 'vitest';
import { exportAllData, importAllData } from './backup';
import { resetDbForTests } from './db';
import {
  getLatestSnapshot,
  getProgress,
  listBookmarks,
  saveBookmark,
  saveProgress,
  saveSnapshot,
} from './repository';

describe('backup round-trip', () => {
  beforeEach(async () => {
    await resetDbForTests();
  });

  it('exports/imports backup format v2 without data loss', async () => {
    await saveProgress({
      lessonId: 'split-resize',
      status: 'in_progress',
      completedMissions: ['split-two-panes'],
      bestScore: 70,
      updatedAt: '2026-02-18T10:00:00.000Z',
    });

    await saveBookmark({
      id: 'bookmark-snapshot',
      type: 'snapshot',
      targetId: 'snapshot-1',
      title: 'snapshot bookmark',
      tags: ['snapshot'],
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    });

    await saveSnapshot({
      id: 'snapshot-1',
      schemaVersion: 2,
      mode: 'NORMAL',
      sessionGraph: {
        schemaVersion: 2,
        simulatorState: { shell: {}, tmux: {}, mode: {} },
      },
      savedAt: '2026-02-18T10:00:00.000Z',
    });

    const payload = await exportAllData('1.0.0-test');
    expect(payload.backup_format_version).toBe(2);
    expect(payload.simulator_defaults.latestSnapshotId).toBe('snapshot-1');

    await resetDbForTests();
    await importAllData(payload, 'replace');

    const progress = await getProgress('split-resize');
    const bookmarks = await listBookmarks();
    const latestSnapshot = await getLatestSnapshot();

    expect(progress?.bestScore).toBe(70);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].type).toBe('snapshot');
    expect(latestSnapshot?.id).toBe('snapshot-1');
  });

  it('converts and imports legacy v1 backup payload', async () => {
    const legacyPayload = {
      backup_format_version: 1,
      exported_at: '2026-01-01T00:00:00.000Z',
      app_version: '0.9.0',
      stores: {
        profile: [],
        progress: [],
        mission_attempts: [],
        bookmarks: [],
        notes: [],
        achievements: [],
        simulator_snapshots: [
          {
            id: 'legacy-snapshot',
            schemaVersion: 2,
            mode: 'NORMAL',
            sessionGraph: {
              schemaVersion: 2,
              simulatorState: { shell: {}, tmux: {}, mode: {} },
            },
            savedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        backup_meta: [],
      },
    };

    await importAllData(legacyPayload, 'replace');
    const exportedAgain = await exportAllData('1.0.0-test');

    expect(exportedAgain.backup_format_version).toBe(2);
    expect(exportedAgain.simulator_defaults.latestSnapshotId).toBe('legacy-snapshot');
  });
});
