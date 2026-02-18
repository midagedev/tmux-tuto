import { describe, expect, it } from 'vitest';
import { loadAppContent } from './contentLoader';
import { curriculumCoverageMatrix, getCoverageRowByMissionSlug } from './coverageMatrix';

describe('coverageMatrix', () => {
  it('returns mission capability row by mission slug', () => {
    const row = getCoverageRowByMissionSlug('command-mode-new-window');

    expect(row).toBeTruthy();
    expect(row?.capabilities).toContain('command-mode.execute');
    expect(row?.requiredRuleKinds).toContain('shellHistoryText');
  });

  it('covers every mission in curriculum content', async () => {
    const content = await loadAppContent();
    const matrixMissionSlugs = new Set(curriculumCoverageMatrix.map((row) => row.missionSlug));

    content.missions.forEach((mission) => {
      expect(matrixMissionSlugs.has(mission.slug)).toBe(true);
    });
  });
});
