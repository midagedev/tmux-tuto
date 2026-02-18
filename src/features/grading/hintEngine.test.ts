import { describe, expect, it } from 'vitest';
import type { AppMission } from '../curriculum/contentSchema';
import type { MissionGradeResult } from './ruleEngine';
import { getHintForMission, getLiveHintForMission } from './hintEngine';

const mission: AppMission = {
  id: 'mission-b-01',
  lessonSlug: 'split-resize',
  slug: 'split-two-panes',
  title: '패인 2개 만들기',
  type: 'state-check',
  difficulty: 'daily',
  initialScenario: 'single-pane',
  passRules: [
    { kind: 'paneCount', operator: '>=', value: 2 },
    { kind: 'actionHistoryText', operator: 'contains', value: 'sim.pane.split' },
  ],
  hints: ['분할 키를 확인하세요.', '분할 후 포커스를 확인하세요.'],
};

function buildResult(overrides?: Partial<MissionGradeResult>): MissionGradeResult {
  return {
    missionSlug: mission.slug,
    passed: false,
    failedRules: [
      {
        kind: 'paneCount',
        operator: '>=',
        expected: 2,
        actual: 1,
        reason: 'paneCount >= 2 조건을 충족하지 못했습니다.',
      },
    ],
    ...overrides,
  };
}

describe('hintEngine', () => {
  it('returns actionable live hint from failed rule', () => {
    const hint = getLiveHintForMission(mission, buildResult());

    expect(hint.hintLevel).toBe(1);
    expect(hint.hintText).toContain('현재 가장 부족한 조건');
    expect(hint.hintText).toContain('패인 분할');
  });

  it('returns success live hint when result already passed', () => {
    const hint = getLiveHintForMission(
      mission,
      buildResult({
        passed: true,
        failedRules: [],
      }),
    );

    expect(hint.hintText).toContain('통과 조건을 만족');
  });

  it('escalates hint content by attempt while preserving failed rule context', () => {
    const level2 = getHintForMission(mission, buildResult(), 2);
    const level3 = getHintForMission(mission, buildResult(), 3);

    expect(level2.hintLevel).toBe(2);
    expect(level2.hintText).toContain('paneCount');
    expect(level3.hintLevel).toBe(3);
    expect(level3.hintText).toContain('우선순위');
  });
});
