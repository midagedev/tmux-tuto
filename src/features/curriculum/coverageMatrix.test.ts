import { describe, expect, it } from 'vitest';
import { loadAppContent } from './contentLoader';
import { curriculumCoverageMatrix, getCoverageRowByMissionSlug } from './coverageMatrix';

describe('coverageMatrix', () => {
  it('returns mission capability row by mission slug', () => {
    const row = getCoverageRowByMissionSlug('command-mode-new-window');

    expect(row).toBeTruthy();
    expect(row?.capabilities).toContain('command-mode.execute');
    expect(row?.requiredRuleKinds).toContain('activeWindowIndex');
  });

  it('covers every mission in curriculum content', async () => {
    const content = await loadAppContent();
    const matrixMissionSlugs = new Set(curriculumCoverageMatrix.map((row) => row.missionSlug));

    content.missions.forEach((mission) => {
      expect(matrixMissionSlugs.has(mission.slug)).toBe(true);
    });
  });

  it('keeps required rule kinds exactly aligned with mission pass rules', async () => {
    const content = await loadAppContent();

    content.missions.forEach((mission) => {
      const row = getCoverageRowByMissionSlug(mission.slug);
      expect(row).toBeTruthy();

      const requiredKinds = [...new Set(row?.requiredRuleKinds ?? [])].sort();
      const missionKinds = [...new Set(mission.passRules.map((rule) => rule.kind))].sort();
      expect(requiredKinds).toEqual(missionKinds);
    });
  });
});
