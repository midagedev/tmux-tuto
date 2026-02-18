import { describe, expect, it } from 'vitest';
import {
  buildAchievementChallengeShareText,
  buildAchievementSharePath,
  isAchievementShareId,
  resolveAchievementShareTarget,
} from './achievementShare';

describe('achievementShare', () => {
  it('builds share route path with encoded payload', () => {
    const path = buildAchievementSharePath('workspace_bootstrap', {
      level: 7,
      xp: 420,
      date: '2026-02-18',
      badge: 'workspace_bootstrap',
    });

    expect(path.startsWith('/share/achievement/workspace_bootstrap?d=')).toBe(true);
  });

  it('resolves known challenge target and share text', () => {
    expect(isAchievementShareId('workspace_bootstrap')).toBe(true);

    const target = resolveAchievementShareTarget('workspace_bootstrap');
    expect(target.path).toContain('/practice?lesson=basics');

    const text = buildAchievementChallengeShareText('세션/윈도우/분할 루틴 완성', 'workspace_bootstrap');
    expect(text).toContain('챌린지');
  });
});
