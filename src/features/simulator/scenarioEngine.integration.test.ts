import { describe, expect, it } from 'vitest';
import type { AppContent, AppMission } from '../curriculum/contentSchema';
import {
  createLessonScenarioState,
  createMissionScenarioState,
  resolveMissionScenarioPresetId,
} from './scenarioEngine';

function buildMission(overrides?: Partial<AppMission>): AppMission {
  return {
    id: 'mission-test',
    lessonSlug: 'lesson-test',
    slug: 'split-two-panes',
    title: 'mission',
    type: 'state-check',
    difficulty: 'daily',
    initialScenario: 'single-pane',
    passRules: [
      {
        kind: 'paneCount',
        operator: '>=',
        value: 2,
      },
    ],
    hints: ['hint'],
    ...overrides,
  };
}

describe('scenarioEngine', () => {
  it('resolves mission scenario preset by mission slug map', () => {
    const mission = buildMission({
      slug: 'copy-mode-search-keyword',
      initialScenario: 'single-pane',
    });

    expect(resolveMissionScenarioPresetId(mission)).toBe('log-buffer');
  });

  it('creates mission state with deterministic scenario marker', () => {
    const mission = buildMission({ slug: 'command-mode-new-window' });

    const state = createMissionScenarioState(mission);
    const latestMessage = state.messages[state.messages.length - 1];
    const latestAction = state.actionHistory[state.actionHistory.length - 1];

    expect(state.scenarioPresetId).toBe('single-pane');
    expect(latestMessage).toBe('Mission scenario loaded: command-mode-new-window');
    expect(latestAction).toBe('sim.scenario.mission.command-mode-new-window');
  });

  it('creates lesson state from the first mission mapped to the lesson', () => {
    const missionA = buildMission({ id: 'm1', lessonSlug: 'split-resize', slug: 'split-two-panes' });
    const missionB = buildMission({ id: 'm2', lessonSlug: 'split-resize', slug: 'pane-grid-layout' });

    const content: AppContent = {
      version: 'v1',
      generatedAt: '2026-01-01T00:00:00.000Z',
      tracks: [],
      chapters: [],
      lessons: [
        {
          id: 'lesson-1',
          trackSlug: 'track-b-workflow',
          chapterSlug: 'split-and-move',
          slug: 'split-resize',
          title: 'split-resize',
          estimatedMinutes: 20,
          objectives: ['split'],
        },
      ],
      missions: [missionA, missionB],
      playbooks: [],
    };

    const state = createLessonScenarioState(content, 'split-resize');
    const latestMessage = state.messages[state.messages.length - 1];

    expect(state.scenarioPresetId).toBe('single-pane');
    expect(latestMessage).toBe('Mission scenario loaded: split-two-panes');
  });
});
