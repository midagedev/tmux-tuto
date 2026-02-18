import { describe, expect, it } from 'vitest';
import type { AppMission } from '../curriculum/contentSchema';
import { createInitialSimulatorState } from '../simulator/model';
import { simulatorReducer } from '../simulator/reducer';
import { evaluateMission } from './ruleEngine';

function buildMission(overrides?: Partial<AppMission>): AppMission {
  return {
    id: 'mission-test',
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
    hints: ['h1', 'h2'],
    ...overrides,
  };
}

describe('evaluateMission', () => {
  it('fails when pane split history condition is not satisfied', () => {
    const state = createInitialSimulatorState();
    const mission = buildMission();

    const result = evaluateMission(state, mission);

    expect(result.passed).toBe(false);
    expect(result.failedRules).toHaveLength(2);
  });

  it('passes when pane count and tmux split action history are satisfied', () => {
    const mission = buildMission();
    const state = simulatorReducer(createInitialSimulatorState(), {
      type: 'SPLIT_PANE',
      payload: 'vertical',
    });

    const result = evaluateMission(state, mission);

    expect(result.passed).toBe(true);
    expect(result.failedRules).toHaveLength(0);
  });

  it('requires shell history evidence for command-mode mission', () => {
    const mission = buildMission({
      slug: 'command-mode-new-window',
      lessonSlug: 'command-subset',
      passRules: [
        { kind: 'windowCount', operator: '>=', value: 2 },
        { kind: 'shellHistoryText', operator: 'contains', value: 'new-window' },
      ],
    });

    const prefixOnlyState = simulatorReducer(createInitialSimulatorState(), {
      type: 'NEW_WINDOW',
    });
    expect(evaluateMission(prefixOnlyState, mission).passed).toBe(false);

    const commandModeState = simulatorReducer(createInitialSimulatorState(), {
      type: 'EXECUTE_COMMAND',
      payload: 'new-window',
    });
    expect(evaluateMission(commandModeState, mission).passed).toBe(true);
  });

  it('distinguishes copy-mode missions by search match result', () => {
    const foundMission = buildMission({
      slug: 'copy-mode-search-keyword',
      lessonSlug: 'copy-search',
      initialScenario: 'log-buffer',
      passRules: [
        { kind: 'modeIs', operator: 'equals', value: 'COPY_MODE' },
        { kind: 'searchExecuted', operator: 'equals', value: true },
        { kind: 'searchMatchFound', operator: 'equals', value: true },
      ],
    });

    const noMatchMission = buildMission({
      slug: 'copy-mode-no-match',
      lessonSlug: 'copy-search',
      initialScenario: 'log-buffer',
      passRules: [
        { kind: 'modeIs', operator: 'equals', value: 'COPY_MODE' },
        { kind: 'searchExecuted', operator: 'equals', value: true },
        { kind: 'searchMatchFound', operator: 'equals', value: false },
      ],
    });

    const foundState = simulatorReducer(
      createInitialSimulatorState({ scenarioPresetId: 'log-buffer' }),
      {
        type: 'RUN_COPY_SEARCH',
        payload: 'error',
      },
    );

    const noMatchState = simulatorReducer(
      createInitialSimulatorState({ scenarioPresetId: 'log-buffer' }),
      {
        type: 'RUN_COPY_SEARCH',
        payload: 'zz-not-found',
      },
    );

    expect(evaluateMission(foundState, foundMission).passed).toBe(true);
    expect(evaluateMission(foundState, noMatchMission).passed).toBe(false);
    expect(evaluateMission(noMatchState, foundMission).passed).toBe(false);
    expect(evaluateMission(noMatchState, noMatchMission).passed).toBe(true);
  });
});
