import { beforeEach, describe, expect, it } from 'vitest';
import { resetDbForTests } from './db';
import {
  getLatestSnapshot,
  getProgress,
  listProgress,
  saveProgress,
  saveSnapshot,
} from './repository';

describe('storage repository integration', () => {
  beforeEach(async () => {
    await resetDbForTests();
  });

  it('round-trips progress records', async () => {
    await saveProgress({
      lessonId: 'split-resize',
      status: 'in_progress',
      completedMissions: ['split-two-panes'],
      bestScore: 80,
      updatedAt: '2026-02-16T10:00:00.000Z',
    });

    const fetched = await getProgress('split-resize');
    const list = await listProgress();

    expect(fetched?.lessonId).toBe('split-resize');
    expect(list).toHaveLength(1);
  });

  it('returns latest snapshot by savedAt sorting', async () => {
    await saveSnapshot({
      id: 'snapshot-1',
      schemaVersion: 2,
      mode: 'NORMAL',
      sessionGraph: {
        schemaVersion: 2,
        simulatorState: { shell: {}, tmux: {}, mode: {} },
      },
      savedAt: '2026-02-16T10:00:00.000Z',
    });

    await saveSnapshot({
      id: 'snapshot-2',
      schemaVersion: 2,
      mode: 'COPY_MODE',
      sessionGraph: {
        schemaVersion: 2,
        simulatorState: { shell: {}, tmux: {}, mode: {} },
      },
      savedAt: '2026-02-16T11:00:00.000Z',
    });

    const latest = await getLatestSnapshot();
    expect(latest?.id).toBe('snapshot-2');
  });
});
