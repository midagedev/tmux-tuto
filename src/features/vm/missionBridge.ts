import type { AppMission } from '../curriculum/contentSchema';

export type VmBridgeSnapshot = {
  sessionCount: number | null;
  windowCount: number | null;
  paneCount: number | null;
  modeIs: string | null;
  searchExecuted: boolean | null;
  searchMatchFound: boolean | null;
  actionHistory: string[];
  commandHistory: string[];
};

export type VmMissionStatus = {
  status: 'complete' | 'incomplete' | 'manual';
  reason: string;
  unsupportedKinds: string[];
};

const ANSI_ESCAPE_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\u001b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

const INTERNAL_PROBE_COMMAND_PATTERNS = [
  'TMUXWEB_TMUX=',
  'TMUXWEB_SESSION=',
  'TMUXWEB_WINDOW=',
  'TMUXWEB_PANE=',
  'TMUXWEB_MODE=',
  'TMUXWEB_PROBE',
];

function isInternalProbeCommand(command: string) {
  const normalized = command.trim();
  if (!normalized) {
    return false;
  }

  return INTERNAL_PROBE_COMMAND_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function evaluateOperator(actual: unknown, operator: string, expected: unknown) {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case '>=':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case '<=':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'contains':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return actual.some((value) => value === expected);
      }
      return false;
    default:
      return false;
  }
}

function getMetricFromSnapshot(snapshot: VmBridgeSnapshot, kind: string): unknown {
  switch (kind) {
    case 'sessionCount':
      return snapshot.sessionCount;
    case 'windowCount':
      return snapshot.windowCount;
    case 'paneCount':
      return snapshot.paneCount;
    case 'modeIs':
      return snapshot.modeIs;
    case 'searchExecuted':
      return snapshot.searchExecuted;
    case 'searchMatchFound':
      return snapshot.searchMatchFound;
    case 'actionHistoryText':
      return snapshot.actionHistory.join(' ');
    case 'shellHistoryText':
      return snapshot.commandHistory.join(' ');
    default:
      return undefined;
  }
}

export function evaluateMissionWithVmSnapshot(mission: AppMission, snapshot: VmBridgeSnapshot): VmMissionStatus {
  const unsupportedKinds = new Set<string>();
  const failedRules: string[] = [];

  mission.passRules.forEach((rule) => {
    const actual = getMetricFromSnapshot(snapshot, rule.kind);
    if (actual === undefined || actual === null) {
      unsupportedKinds.add(rule.kind);
      return;
    }

    const passed = evaluateOperator(actual, rule.operator, rule.value);
    if (!passed) {
      failedRules.push(`${rule.kind} ${rule.operator} ${JSON.stringify(rule.value)}`);
    }
  });

  if (unsupportedKinds.size > 0) {
    return {
      status: 'manual',
      reason: `수동 확인 필요: ${Array.from(unsupportedKinds).join(', ')}`,
      unsupportedKinds: Array.from(unsupportedKinds),
    };
  }

  if (failedRules.length === 0) {
    return {
      status: 'complete',
      reason: '자동 채점 통과',
      unsupportedKinds: [],
    };
  }

  return {
    status: 'incomplete',
    reason: `미충족 조건: ${failedRules[0]}`,
    unsupportedKinds: [],
  };
}

export function stripAnsi(value: string) {
  return value.replace(ANSI_ESCAPE_PATTERN, '').split('\u000f').join('');
}

export function extractCommandFromPromptLine(line: string) {
  const cleaned = stripAnsi(line).replace(/\r/g, '').trimEnd();
  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/[#$%]\s+(.+)$/);
  if (!match) {
    return null;
  }

  const command = match[1].trim();
  if (!command || isInternalProbeCommand(command)) {
    return null;
  }

  return command;
}

export function parseTmuxActionsFromCommand(command: string) {
  const normalized = command.trim().toLowerCase();
  if (!normalized.includes('tmux')) {
    return [];
  }

  const actions = new Set<string>();
  actions.add('sim.command.execute');

  if (
    /\btmux\s+(new-session|new)\b/.test(normalized) ||
    /\btmux\s+new\s+-a/.test(normalized) ||
    /\btmux\s+new\s+-as/.test(normalized)
  ) {
    actions.add('sim.session.new');
  }

  if (/\btmux\s+(new-window|neww)\b/.test(normalized)) {
    actions.add('sim.window.new');
  }

  if (/\btmux\s+(split-window|splitw)\b/.test(normalized)) {
    actions.add('sim.pane.split');
  }

  if (/\btmux\s+(next-window|nextw)\b/.test(normalized)) {
    actions.add('sim.window.next');
  }

  if (/\btmux\s+(previous-window|prevw)\b/.test(normalized)) {
    actions.add('sim.window.prev');
  }

  if (/\btmux\s+copy-mode\b/.test(normalized)) {
    actions.add('sim.copymode.enter');
  }

  if (/\btmux\s+kill-pane\b/.test(normalized)) {
    actions.add('sim.pane.kill');
  }

  return Array.from(actions);
}

export type VmProbeMetric = {
  key: 'session' | 'window' | 'pane' | 'tmux' | 'mode' | 'search' | 'searchMatched';
  value: number;
};

export function parseProbeMetricFromLine(line: string): VmProbeMetric | null {
  const cleaned = stripAnsi(line).replace(/\r/g, '');
  const match = cleaned.match(
    /\[\[TMUXWEB_PROBE:(session|window|pane|tmux|mode|search|searchMatched):(-?\d+)\]\]/,
  );
  if (!match) {
    return null;
  }

  return {
    key: match[1] as VmProbeMetric['key'],
    value: Number.parseInt(match[2], 10),
  };
}
