import type { AppMission } from '../curriculum/contentSchema';
export type VmBridgeSnapshot = {
    sessionCount: number | null;
    windowCount: number | null;
    paneCount: number | null;
    modeIs: string | null;
    sessionName: string | null;
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
    'TMUXWEB_ACTIVE_WINDOW=',
    'TMUXWEB_LAYOUT=',
    'TMUXWEB_ZOOMED=',
    'TMUXWEB_SYNC=',
    'TMUXWEB_PROBE',
];
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
        case 'modeIs':
            return snapshot.modeIs;
        case 'sessionName':
            return snapshot.sessionName;
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
            reason: __tx("\uC218\uB3D9 \uD655\uC778 \uD544\uC694: ") + Array.from(unsupportedKinds).join(', '),
            unsupportedKinds: Array.from(unsupportedKinds),
        };
    }
    if (failedRules.length === 0) {
        return {
            status: 'complete',
            reason: __tx("\uC790\uB3D9 \uCC44\uC810 \uD1B5\uACFC"),
            unsupportedKinds: [],
        };
    }
    return {
        status: 'incomplete',
        reason: __tx("\uBBF8\uCDA9\uC871 \uC870\uAC74: ") + failedRules[0],
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
    const normalized = command.trim().toLowerCase();
    if (!normalized.includes('tmux')) {
        return [];
    }
    const actions = new Set<string>();
    actions.add('sim.command.execute');
    if (/\btmux\s+(new-session|new)\b/.test(normalized) ||
        /\btmux\s+new\s+-a/.test(normalized) ||
        /\btmux\s+new\s+-as/.test(normalized)) {
        actions.add('sim.session.new');
    }
    if (/\btmux\s+(new-window|neww)\b/.test(normalized)) {
        actions.add('sim.window.new');
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
type VmProbeNumericKey = 'session' | 'window' | 'pane' | 'tmux' | 'mode' | 'search' | 'searchMatched' | 'activeWindow' | 'zoomed' | 'sync';
type VmProbeTextKey = 'sessionName' | 'layout';
export type VmProbeMetric = {
    key: VmProbeNumericKey;
    value: number;
} | {
    key: VmProbeTextKey;
    value: string;
};
export function parseProbeMetricFromLine(line: string): VmProbeMetric | null {
    const cleaned = stripAnsi(line).replace(/\r/g, '');
    const match = cleaned.match(/\[\[TMUXWEB_PROBE:(session|window|pane|tmux|mode|search|searchMatched|activeWindow|zoomed|sync|sessionName|layout):([^\]]*)\]\]/);
    if (!match) {
        return null;
    }
    if (match[1] === 'sessionName' || match[1] === 'layout') {
        return {
            key: match[1] as VmProbeTextKey,
            value: match[2].trim(),
        };
    }
    const value = Number.parseInt(match[2], 10);
    if (Number.isNaN(value)) {
        return null;
    }
    return {
        key: match[1] as VmProbeNumericKey,
        value,
    };
}
