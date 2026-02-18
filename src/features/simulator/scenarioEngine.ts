import type { AppContent, AppMission } from '../curriculum/contentSchema';
import { createInitialSimulatorState, type SimulatorState } from './model';
import { simulatorReducer, type SimulatorAction } from './reducer';

const MISSION_PRESET_OVERRIDES: Record<string, string> = {
  'session-create': 'single-pane',
  'session-window-create': 'single-pane',
  'session-multi-manage': 'single-pane',
  'split-two-panes': 'single-pane',
  'pane-grid-layout': 'single-pane',
  'window-cycle-practice': 'single-pane',
  'copy-mode-search-keyword': 'log-buffer',
  'copy-mode-no-match': 'log-buffer',
  'command-mode-new-window': 'single-pane',
};

function applyActions(state: SimulatorState, actions: SimulatorAction[]) {
  return actions.reduce(simulatorReducer, state);
}

export function resolveMissionScenarioPresetId(mission: AppMission) {
  return MISSION_PRESET_OVERRIDES[mission.slug] ?? mission.initialScenario;
}

export function createScenarioStateForPresetId(scenarioPresetId: string): SimulatorState {
  return createInitialSimulatorState({ scenarioPresetId });
}

export function createMissionScenarioState(mission: AppMission): SimulatorState {
  const scenarioPresetId = resolveMissionScenarioPresetId(mission);
  const baseState = createScenarioStateForPresetId(scenarioPresetId);

  return applyActions(baseState, [
    { type: 'ADD_MESSAGE', payload: `Mission scenario loaded: ${mission.slug}` },
    { type: 'RECORD_ACTION', payload: `sim.scenario.mission.${mission.slug}` },
  ]);
}

export function createLessonScenarioState(content: AppContent, lessonSlug: string): SimulatorState {
  const firstMission = content.missions.find((mission) => mission.lessonSlug === lessonSlug);
  if (!firstMission) {
    return createInitialSimulatorState();
  }

  return createMissionScenarioState(firstMission);
}
