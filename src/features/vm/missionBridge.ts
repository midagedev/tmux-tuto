import type { AppMission } from '../curriculum/contentSchema';

export type VmBridgeSnapshot = {
  sessionCount: number | null;
  windowCount: number | null;
  paneCount: number | null;
  scrollPosition: number | null;
  modeIs: string | null;
  sessionName: string | null;
  windowName: string | null;
  activeWindowIndex: number | null;
  windowLayout: string | null;
  windowZoomed: boolean | null;
  paneSynchronized: boolean | null;
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
  '__tmuxweb_probe',
  '__tmuxweb_probe(){',
  '__tmuxweb_banner',
  'tmux-tuto-probe',
  '/usr/bin/tmux-tuto-probe',
  '/usr/bin/tmux-tuto-banner',
  'TMUXWEB_',
  'TMUXWEB_TMUX=',
  'TMUXWEB_SESSION=',
  'TMUXWEB_WINDOW=',
  'TMUXWEB_PANE=',
  'TMUXWEB_MODE=',
  'TMUXWEB_SESSION_NAME=',
  'TMUXWEB_WINDOW_NAME=',
  'TMUXWEB_ACTIVE_WINDOW=',
  'TMUXWEB_LAYOUT=',
  'TMUXWEB_ZOOMED=',
  'TMUXWEB_SYNC=',
  'TMUXWEB_STATE_V2',
];

export const PROBE_STATE_MARKER = 'TMUXWEB_STATE_V2';

export function isInternalProbeLine(line: string) {
  const normalized = stripAnsi(line).replace(/\r/g, '').trim();
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
    case 'scrollPosition':
      return snapshot.scrollPosition;
    case 'modeIs':
      return snapshot.modeIs;
    case 'sessionName':
      return snapshot.sessionName;
    case 'windowName':
      return snapshot.windowName;
    case 'activeWindowIndex':
      return snapshot.activeWindowIndex;
    case 'windowLayout':
      return snapshot.windowLayout;
    case 'windowZoomed':
      return snapshot.windowZoomed;
    case 'paneSynchronized':
      return snapshot.paneSynchronized;
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
    if (actual === undefined) {
      unsupportedKinds.add(rule.kind);
      return;
    }

    if (actual === null) {
      failedRules.push(`${rule.kind} ${rule.operator} ${JSON.stringify(rule.value)}`);
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
  if (!command || isInternalProbeLine(command)) {
    return null;
  }

  return command;
}

export function parseTmuxActionsFromCommand(command: string) {
  const normalizedCommand = command.trim().toLowerCase();
  if (!normalizedCommand) {
    return [];
  }

  const bareTmuxSubcommandPattern =
    /^(new-session|new-window|neww|rename-window|renamew|rename-session|split-window|splitw|select-pane|selectp|last-pane|resize-pane|resizep|swap-pane|swapp|join-pane|joinp|move-pane|movep|rotate-window|rotatew|select-layout|selectl|next-window|nextw|previous-window|prevw|copy-mode|kill-pane|set-window-option|setw|command-prompt|commandp|choose-tree)\b/;
  const normalized = normalizedCommand.includes('tmux')
    ? normalizedCommand
    : bareTmuxSubcommandPattern.test(normalizedCommand)
      ? `tmux ${normalizedCommand}`
      : normalizedCommand;

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

  if (/\btmux\s+(rename-window|renamew)\b/.test(normalized)) {
    actions.add('sim.window.rename');
  }

  if (/\btmux\s+rename-session\b/.test(normalized)) {
    actions.add('sim.session.rename');
  }

  if (/\btmux\s+(split-window|splitw)\b/.test(normalized)) {
    actions.add('sim.pane.split');
  }

  if (/\btmux\s+(select-pane|selectp|last-pane)\b/.test(normalized)) {
    actions.add('sim.pane.select');
  }

  if (/\btmux\s+(resize-pane|resizep)\b/.test(normalized)) {
    actions.add('sim.pane.resize');
    if (/\btmux\s+(resize-pane|resizep)\b[^;]*\s-z\b/.test(normalized)) {
      actions.add('sim.pane.zoom.toggle');
    }
  }

  if (/\btmux\s+(swap-pane|swapp)\b/.test(normalized)) {
    actions.add('sim.pane.swap');
  }

  if (/\btmux\s+(join-pane|joinp|move-pane|movep)\b/.test(normalized)) {
    actions.add('sim.pane.join');
  }

  if (/\btmux\s+(rotate-window|rotatew)\b/.test(normalized)) {
    actions.add('sim.window.rotate');
  }

  if (/\btmux\s+(select-layout|selectl)\b/.test(normalized)) {
    actions.add('sim.layout.select');
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

  if (/\btmux\s+(set-window-option|setw)\b/.test(normalized) && /\bsynchronize-panes\b/.test(normalized)) {
    actions.add('sim.panes.sync.toggle');
  }

  if (/\btmux\s+(command-prompt|commandp)\b/.test(normalized)) {
    actions.add('sim.command.prompt');
  }

  if (/\btmux\s+choose-tree\b/.test(normalized)) {
    actions.add('sim.choose.tree');
  }

  return Array.from(actions);
}

type VmProbeNumericKey =
  | 'session'
  | 'window'
  | 'pane'
  | 'scrollPosition'
  | 'tmux'
  | 'mode'
  | 'search'
  | 'searchMatched'
  | 'activeWindow'
  | 'zoomed'
  | 'sync';

type VmProbeTextKey = 'sessionName' | 'windowName' | 'layout';

export type VmProbeMetric =
  | {
      key: VmProbeNumericKey;
      value: number;
    }
  | {
      key: VmProbeTextKey;
      value: string;
    };

export type VmProbeStateSnapshot = {
  tmux: number;
  session: number;
  window: number;
  pane: number;
  scrollPosition?: number;
  mode: number;
  sessionName: string;
  windowName: string;
  activeWindow: number;
  layout: string;
  zoomed: number;
  sync: number;
  search: number;
  searchMatched: number;
};

function parseProbeStateNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export const PROBE_SCROLL_MARKER = 'TMUXWEB_SCROLL_V1';

export function parseProbeMetricFromLine(line: string): VmProbeMetric | null {
  const cleaned = stripAnsi(line)
    .replace(/\r/g, '')
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || (code >= 32 && code !== 127);
    })
    .join('');
  const markerToken = `[[${PROBE_SCROLL_MARKER}:`;
  const markerIndex = cleaned.indexOf(markerToken);
  if (markerIndex < 0) {
    return null;
  }

  const prefix = cleaned.slice(0, markerIndex);
  if (/\becho\b/i.test(prefix) || /\b__tmuxweb_probe\b/i.test(prefix)) {
    return null;
  }

  const match = cleaned.match(/\[\[TMUXWEB_SCROLL_V1:([^\]]*)\]\]/);
  if (!match) {
    return null;
  }

  const value = parseProbeStateNumber(match[1].trim());
  if (value === null) {
    return null;
  }

  return {
    key: 'scrollPosition',
    value,
  };
}

export function parseProbeStateFromLine(line: string): VmProbeStateSnapshot | null {
  const cleaned = stripAnsi(line)
    .replace(/\r/g, '')
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || (code >= 32 && code !== 127);
    })
    .join('');
  const markerToken = `[[${PROBE_STATE_MARKER}:`;
  const markerIndex = cleaned.indexOf(markerToken);
  if (markerIndex < 0) {
    return null;
  }

  const prefix = cleaned.slice(0, markerIndex);
  if (/\becho\b/i.test(prefix) || /\b__tmuxweb_probe\b/i.test(prefix)) {
    return null;
  }

  const match = cleaned.match(/\[\[TMUXWEB_STATE_V2:([^\]]*)\]\]/);
  if (!match) {
    return null;
  }

  const fields = match[1].split('\t');
  if (fields.length !== 13 && fields.length !== 14) {
    return null;
  }

  const tmux = parseProbeStateNumber(fields[0]);
  const session = parseProbeStateNumber(fields[1]);
  const window = parseProbeStateNumber(fields[2]);
  const pane = parseProbeStateNumber(fields[3]);
  const hasScrollPositionField = fields.length === 14;
  const scrollPosition = hasScrollPositionField ? parseProbeStateNumber(fields[4]) : null;
  const mode = parseProbeStateNumber(fields[hasScrollPositionField ? 5 : 4]);
  const sessionName = fields[hasScrollPositionField ? 6 : 5].trim();
  const windowName = fields[hasScrollPositionField ? 7 : 6].trim();
  const activeWindow = parseProbeStateNumber(fields[hasScrollPositionField ? 8 : 7]);
  const layout = fields[hasScrollPositionField ? 9 : 8].trim();
  const zoomed = parseProbeStateNumber(fields[hasScrollPositionField ? 10 : 9]);
  const sync = parseProbeStateNumber(fields[hasScrollPositionField ? 11 : 10]);
  const search = parseProbeStateNumber(fields[hasScrollPositionField ? 12 : 11]);
  const searchMatched = parseProbeStateNumber(fields[hasScrollPositionField ? 13 : 12]);

  if (
    tmux === null ||
    session === null ||
    window === null ||
    pane === null ||
    (hasScrollPositionField && scrollPosition === null) ||
    mode === null ||
    activeWindow === null ||
    zoomed === null ||
    sync === null ||
    search === null ||
    searchMatched === null
  ) {
    return null;
  }

  if (sessionName.includes('%s') || windowName.includes('%s') || layout.includes('%s')) {
    return null;
  }

  return {
    tmux,
    session,
    window,
    pane,
    ...(hasScrollPositionField ? { scrollPosition: scrollPosition as number } : {}),
    mode,
    sessionName,
    windowName,
    activeWindow,
    layout,
    zoomed,
    sync,
    search,
    searchMatched,
  };
}
