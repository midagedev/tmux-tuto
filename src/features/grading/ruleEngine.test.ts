import { describe, expect, it } from 'vitest';
import type { AppMission } from '../curriculum/contentSchema';
import { createInitialSimulatorState } from '../simulator/model';
import { simulatorReducer } from '../simulator/reducer';
import { evaluateMission } from './ruleEngine';

const mission: AppMission = {
  id: 'mission-test-split-two-panes',
  lessonSlug: 'split-resize',
  slug: 'split-two-panes',
  title: '패인 2개 만들기',
  type: 'state-check',
  difficulty: 'daily',
  initialScenario: 'single-pane',
  passRules: [{ kind: 'paneCount', operator: '>=', value: 2 }],
  hints: ['h1', 'h2'],
};

describe('evaluateMission', () => {
  it('fails when pane count is below required value', () => {
    const state = createInitialSimulatorState();
    const result = evaluateMission(state, mission);

    expect(result.passed).toBe(false);
    expect(result.failedRules).toHaveLength(1);
  });

  it('passes when mission rules are satisfied', () => {
    const state = simulatorReducer(createInitialSimulatorState(), {
      type: 'SPLIT_PANE',
      payload: 'vertical',
    });
    const result = evaluateMission(state, mission);

    expect(result.passed).toBe(true);
    expect(result.failedRules).toHaveLength(0);
  });
});
