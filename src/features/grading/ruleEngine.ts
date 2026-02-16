import type { AppMission } from '../curriculum/contentSchema';
import { getActiveWindow, type SimulatorState } from '../simulator/model';

type RuleResult = {
  passed: boolean;
  expected: unknown;
  actual: unknown;
};

export type MissionGradeResult = {
  missionSlug: string;
  passed: boolean;
  failedRules: Array<{
    kind: string;
    operator: string;
    expected: unknown;
    actual: unknown;
    reason: string;
  }>;
};

function evaluateOperator(actual: unknown, operator: string, expected: unknown): RuleResult {
  switch (operator) {
    case 'equals':
      return { passed: actual === expected, expected, actual };
    case '>=':
      return {
        passed: typeof actual === 'number' && typeof expected === 'number' ? actual >= expected : false,
        expected,
        actual,
      };
    case '<=':
      return {
        passed: typeof actual === 'number' && typeof expected === 'number' ? actual <= expected : false,
        expected,
        actual,
      };
    default:
      return { passed: false, expected, actual };
  }
}

function getMetricFromState(state: SimulatorState, kind: string): unknown {
  const activeWindow = getActiveWindow(state);

  switch (kind) {
    case 'paneCount':
      return activeWindow.panes.length;
    case 'windowCount': {
      const activeSession = state.sessions.find((session) => session.id === state.activeSessionId);
      return activeSession?.windows.length ?? 0;
    }
    case 'sessionCount':
      return state.sessions.length;
    case 'modeIs':
      return state.mode;
    case 'searchExecuted':
      return state.copyMode.searchExecuted;
    case 'activePaneId':
      return activeWindow.activePaneId;
    default:
      return undefined;
  }
}

export function evaluateMission(state: SimulatorState, mission: AppMission): MissionGradeResult {
  const failedRules: MissionGradeResult['failedRules'] = [];

  mission.passRules.forEach((rule) => {
    const actual = getMetricFromState(state, rule.kind);
    const result = evaluateOperator(actual, rule.operator, rule.value);

    if (!result.passed) {
      failedRules.push({
        kind: rule.kind,
        operator: rule.operator,
        expected: rule.value,
        actual,
        reason: `${rule.kind} ${rule.operator} ${JSON.stringify(rule.value)} 조건을 충족하지 못했습니다.`,
      });
    }
  });

  return {
    missionSlug: mission.slug,
    passed: failedRules.length === 0,
    failedRules,
  };
}
