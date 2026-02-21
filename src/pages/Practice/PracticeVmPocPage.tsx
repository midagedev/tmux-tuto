import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import type V86 from 'v86';
import type { V86Options } from 'v86';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { setClarityTag, trackClarityEvent } from '../../features/analytics';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import { resolveLessonPracticeType } from '../../features/curriculum/lessonPracticeType';
import { resolveLessonTerms } from '../../features/curriculum/lessonTerms';
import { renderTextWithShortcutTooltip } from '../../features/curriculum/shortcutTooltip';
import { getAchievementDefinition } from '../../features/progress';
import { useProgressStore } from '../../features/progress/progressStore';
import {
  evaluateMissionWithVmSnapshot,
  parseProbeMetricFromLine,
  parseTmuxActionsFromCommand,
  stripAnsi,
  type VmBridgeSnapshot,
  type VmProbeMetric,
} from '../../features/vm/missionBridge';
import {
  createTmuxShortcutTelemetryState,
  parseTmuxShortcutTelemetry,
} from '../../features/vm/tmuxShortcutTelemetry';
import {
  PROBE_LOOP_START_COMMAND,
  PROBE_LOOP_STOP_COMMAND,
  PROBE_TRIGGER_COMMAND,
  SEARCH_PROBE_TRIGGER_COMMAND,
  buildTerminalGeometrySyncCommand,
} from './probeCommands';
import {
  buildLessonProgressRows,
  filterLessonProgressRows,
  resolveDefaultMissionSlugForLesson,
  type LessonCompletionStatus,
  type LessonFilter,
} from './lessonProgress';
import { resolveInitialLessonSlugFromQuery } from './urlState';

type VmStatus = 'idle' | 'booting' | 'running' | 'stopped' | 'error';

type VmMetricState = {
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
};

type AchievementFeedEntry = {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
};

type VmInitialState = {
  buffer: ArrayBuffer;
};

declare global {
  interface Window {
    __tmuxwebVmBridge?: {
      isReady: () => boolean;
      getStatus: () => {
        status: VmStatus;
        text: string;
        metrics: VmMetricState;
        actionHistory: string[];
        commandHistory: string[];
        debugLineCount: number;
        lastDebugLine: string | null;
      };
      saveState: () => Promise<ArrayBuffer | null>;
      sendProbe: () => void;
      sendCommand: (command: string) => void;
      getBootConfig: () => typeof VM_BOOT_CONFIG;
      getLastEmulatorOptions: () => V86Options | null;
    };
  }
}

const MAX_HISTORY = 240;
const MAX_DEBUG_LINES = 220;
const V86_STATE_MAGIC_LE = 0x86768676;
const ZSTD_MAGIC_LE = 0xfd2fb528;
const DEFAULT_TERMINAL_COLS = 80;
const DEFAULT_TERMINAL_ROWS = 24;
const BANNER_TRIGGER_COMMAND = '/usr/bin/tmux-tuto-banner';
const ACHIEVEMENT_FEED_BATCH_DELAY_MS = 400;
const MAX_ACHIEVEMENT_FEED_ITEMS = 8;
const TERMINAL_GEOMETRY_SYNC_COMMAND = buildTerminalGeometrySyncCommand(
  DEFAULT_TERMINAL_COLS,
  DEFAULT_TERMINAL_ROWS,
);

const QUICK_COMMANDS = [
  {
    label: '새 세션 생성',
    command: 'tmux new-session -d -s lesson && tmux list-sessions',
  },
  {
    label: '새 윈도우 생성',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux new-window -t lesson -n win2; tmux list-windows -t lesson',
  },
  {
    label: 'Pane 분할',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux split-window -t lesson; tmux list-panes -t lesson',
  },
  {
    label: '다음 윈도우',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux next-window -t lesson; tmux display-message -p "window #{window_index}"',
  },
  {
    label: 'Copy Search 성공',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux copy-mode -t lesson:0.0; tmux send-keys -t lesson:0.0 -X search-backward "bin"; printf "[[TMUXWEB_PROBE:search:1]]\\n[[TMUXWEB_PROBE:searchMatched:1]]\\n" > /dev/ttyS1',
  },
  {
    label: 'Copy Search 실패',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux copy-mode -t lesson:0.0; tmux send-keys -t lesson:0.0 -X search-backward "__TMUXWEB_NOT_FOUND__"; printf "[[TMUXWEB_PROBE:search:1]]\\n[[TMUXWEB_PROBE:searchMatched:0]]\\n" > /dev/ttyS1',
  },
  {
    label: '레이아웃 변경',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux select-layout -t lesson:0 even-horizontal; tmux display-message -p "#{window_layout}"',
  },
  {
    label: 'Pane 줌 토글',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux resize-pane -t lesson:0.0 -Z; tmux display-message -p "#{window_zoomed_flag}"',
  },
  {
    label: 'Pane Sync ON',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux set-window-option -t lesson:0 synchronize-panes on; tmux show-window-options -t lesson:0 -v synchronize-panes',
  },
] as const;

const LEARNING_PATH_ENTRY_LESSON = 'hello-tmux';
const LESSON_FILTER_OPTIONS: Array<{ value: LessonFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'continue', label: '이어하기' },
  { value: 'incomplete', label: '미완료' },
  { value: 'completed', label: '완료' },
];

function resolveAssetPath(relativePath: string) {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedRelative = relativePath.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedRelative}`;
}

const VM_BOOT_CONFIG = {
  wasmPath: resolveAssetPath('vm/v86.wasm'),
  wasmFallbackPath: resolveAssetPath('vm/v86-fallback.wasm'),
  biosPath: resolveAssetPath('vm/seabios.bin'),
  vgaBiosPath: resolveAssetPath('vm/vgabios.bin'),
  fsBasePath: resolveAssetPath('vm/alpine-tmux-flat/'),
  fsJsonPath: resolveAssetPath('vm/alpine-tmux-fs.json'),
  initialStatePath:
    (import.meta.env.VITE_VM_INITIAL_STATE_PATH as string | undefined)?.trim() ||
    resolveAssetPath('vm/alpine-tmux-ready.bin.zst'),
};

function hasValidVmStateMagic(buffer: ArrayBuffer) {
  if (buffer.byteLength < 4) {
    return false;
  }

  const magic = new DataView(buffer).getUint32(0, true);
  return magic === V86_STATE_MAGIC_LE || magic === ZSTD_MAGIC_LE;
}

async function loadVmInitialState(initialStatePath: string): Promise<VmInitialState | null> {
  if (!initialStatePath) {
    return null;
  }

  try {
    const response = await fetch(initialStatePath, { cache: 'no-cache' });
    if (!response.ok) {
      return null;
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (contentType.includes('text/html')) {
      return null;
    }

    const stateBuffer = await response.arrayBuffer();
    if (stateBuffer.byteLength < 1024 || !hasValidVmStateMagic(stateBuffer)) {
      return null;
    }

    return { buffer: stateBuffer };
  } catch {
    return null;
  }
}

function trimHistory(history: string[], max: number) {
  if (history.length <= max) {
    return history;
  }
  return history.slice(history.length - max);
}

function appendHistory(history: string[], nextItem: string, max: number) {
  const normalized = nextItem.trim();
  if (!normalized) {
    return history;
  }

  if (history[history.length - 1] === normalized) {
    return history;
  }

  return trimHistory([...history, normalized], max);
}

function appendActions(history: string[], actions: string[], max: number) {
  if (actions.length === 0) {
    return history;
  }

  return trimHistory([...history, ...actions], max);
}

function getDifficultyLabel(t: TFunction, difficulty: AppMission['difficulty']) {
  switch (difficulty) {
    case 'beginner':
      return t('입문');
    case 'daily':
      return t('실전');
    case 'advanced':
      return t('고급');
    case 'scenario':
      return t('시나리오');
    default:
      return difficulty;
  }
}

function getMetricBadgeClass(status: VmStatus) {
  if (status === 'running') {
    return 'is-running';
  }
  if (status === 'booting') {
    return 'is-booting';
  }
  if (status === 'error') {
    return 'is-error';
  }
  return 'is-idle';
}

type MissionPreconditionItem = {
  key: string;
  label: string;
  current: string;
  satisfied: boolean;
};

const ACTION_HISTORY_COMMAND_SUGGESTIONS: Record<string, string> = {
  'sim.pane.resize': 'tmux resize-pane -R 5',
  'sim.pane.join': 'tmux join-pane -hb -s :.3 -t :.0',
  'sim.command.prompt': 'tmux command-prompt -p "cmd"',
  'sim.choose.tree': 'tmux choose-tree -Z',
};
const SHORTCUT_TOOLTIP_TEXT = '입력 순서: Ctrl 키를 누른 채 b를 누른 뒤 손을 떼고, 다음 키를 입력하세요.';

function uniqueStrings(values: string[]) {
  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
}

function extractInlineCodeCandidates(text: string) {
  return Array.from(text.matchAll(/`([^`]+)`/g))
    .map((match) => match[1]?.trim() ?? '')
    .filter((value) => value.length > 0);
}

function getShortcutTooltipForToken(token: string) {
  const normalized = token.toLowerCase().replace(/\s+/g, '');
  if (normalized.includes('ctrl+b') || normalized.startsWith('prefix')) {
    return SHORTCUT_TOOLTIP_TEXT;
  }

  return null;
}

function renderPlainHintSegmentWithTooltip(text: string, keyPrefix: string, t: TFunction) {
  return text.split(/(Ctrl\s*\+\s*b)/gi).map((segment, index) => {
    if (!segment) {
      return null;
    }

    if (/^Ctrl\s*\+\s*b$/i.test(segment)) {
      return (
        <span
          key={`${keyPrefix}-shortcut-${index}`}
          className="vm-shortcut-inline-tooltip"
          title={t(SHORTCUT_TOOLTIP_TEXT)}
          aria-label={t('단축키 안내: {{shortcutTooltip}}', { shortcutTooltip: t(SHORTCUT_TOOLTIP_TEXT) })}
        >
          <code>Ctrl+b</code>
        </span>
      );
    }

    return <span key={`${keyPrefix}-text-${index}`}>{segment}</span>;
  });
}

function renderHintTextWithTooltips(hint: string, keyPrefix: string, t: TFunction) {
  return hint.split(/(`[^`]+`)/g).flatMap((segment, index) => {
    const codeMatch = segment.match(/^`([^`]+)`$/);
    if (!codeMatch) {
      return renderPlainHintSegmentWithTooltip(segment, `${keyPrefix}-plain-${index}`, t);
    }

    const token = codeMatch[1];
    const shortcutTooltip = getShortcutTooltipForToken(token);
    if (shortcutTooltip) {
      return (
        <span
          key={`${keyPrefix}-code-${index}`}
          className="vm-shortcut-inline-tooltip"
          title={t(shortcutTooltip)}
          aria-label={t('단축키 안내: {{shortcutTooltip}}', { shortcutTooltip: t(shortcutTooltip) })}
        >
          <code>{token}</code>
        </span>
      );
    }

    return <code key={`${keyPrefix}-code-${index}`}>{token}</code>;
  });
}

function isLikelyCommandText(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('tmux')) {
    return true;
  }

  return /(new-window|split-window|resize-pane|choose-tree|command-prompt|next-window|previous-window|attach)/.test(
    normalized,
  );
}

function getRuleCommandSuggestions(rule: AppMission['passRules'][number]) {
  switch (rule.kind) {
    case 'shellHistoryText':
      return typeof rule.value === 'string' ? [rule.value] : [];
    case 'actionHistoryText':
      if (typeof rule.value !== 'string') {
        return [];
      }
      return ACTION_HISTORY_COMMAND_SUGGESTIONS[rule.value] ? [ACTION_HISTORY_COMMAND_SUGGESTIONS[rule.value]] : [];
    case 'sessionCount':
      return ['tmux new -As main'];
    case 'windowCount':
      return ['tmux new-window -n work'];
    case 'paneCount':
      return ['tmux split-window'];
    case 'activeWindowIndex':
      return ['tmux next-window'];
    case 'modeIs':
      return rule.value === 'COPY_MODE' ? ['tmux copy-mode'] : [];
    case 'searchExecuted':
    case 'searchMatchFound':
      return ['tmux copy-mode', 'tmux send-keys -X search-backward "keyword"'];
    default:
      return [];
  }
}

function buildMissionCommandSuggestions(mission: AppMission | null) {
  if (!mission) {
    return [];
  }

  const commandsFromRules = mission.passRules.flatMap((rule) => getRuleCommandSuggestions(rule));
  const commandsFromHints = mission.hints
    .flatMap((hint) => extractInlineCodeCandidates(hint))
    .filter((candidate) => isLikelyCommandText(candidate));

  return uniqueStrings([...commandsFromRules, ...commandsFromHints]).slice(0, 6);
}

function getRuleMetricValue(snapshot: VmBridgeSnapshot, kind: string): unknown {
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

function evaluateRuleOperator(actual: unknown, operator: string, expected: unknown) {
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

function getRulePreconditionLabel(t: TFunction, rule: AppMission['passRules'][number]) {
  switch (rule.kind) {
    case 'sessionCount':
      return t('세션 수가 {{operator}} {{value}} 이어야 함', { operator: rule.operator, value: String(rule.value) });
    case 'windowCount':
      return t('윈도우 수가 {{operator}} {{value}} 이어야 함', { operator: rule.operator, value: String(rule.value) });
    case 'paneCount':
      return t('패인 수가 {{operator}} {{value}} 이어야 함', { operator: rule.operator, value: String(rule.value) });
    case 'activeWindowIndex':
      return t('활성 윈도우 인덱스가 {{operator}} {{value}} 이어야 함', {
        operator: rule.operator,
        value: String(rule.value),
      });
    case 'modeIs':
      return rule.value === 'COPY_MODE'
        ? t('Copy Mode에 진입해야 함')
        : t('mode 값이 {{operator}} {{value}} 이어야 함', { operator: rule.operator, value: String(rule.value) });
    case 'searchExecuted':
      return t('Copy Mode에서 검색을 실행해야 함');
    case 'searchMatchFound':
      return rule.value === true ? t('검색 결과가 있어야 함') : t('검색 결과가 없어야 함');
    case 'shellHistoryText':
      return t('쉘 히스토리에 {{value}} 실행 기록이 있어야 함', { value: JSON.stringify(rule.value) });
    case 'actionHistoryText':
      return t('tmux 액션 로그에 {{value}} 기록이 있어야 함', { value: JSON.stringify(rule.value) });
    default:
      return t('{{kind}} {{operator}} {{value}} 조건', {
        kind: rule.kind,
        operator: rule.operator,
        value: JSON.stringify(rule.value),
      });
  }
}

function getRuleCurrentStateText(t: TFunction, rule: AppMission['passRules'][number], snapshot: VmBridgeSnapshot) {
  switch (rule.kind) {
    case 'sessionCount':
      return t('현재 session: {{value}}', { value: snapshot.sessionCount ?? '-' });
    case 'windowCount':
      return t('현재 window: {{value}}', { value: snapshot.windowCount ?? '-' });
    case 'paneCount':
      return t('현재 pane: {{value}}', { value: snapshot.paneCount ?? '-' });
    case 'activeWindowIndex':
      return t('현재 activeWindow: {{value}}', { value: snapshot.activeWindowIndex ?? '-' });
    case 'modeIs':
      return t('현재 mode: {{value}}', { value: snapshot.modeIs ?? '-' });
    case 'searchExecuted':
      return t('현재 searchExecuted: {{value}}', {
        value: snapshot.searchExecuted === null ? '-' : snapshot.searchExecuted ? 'yes' : 'no',
      });
    case 'searchMatchFound':
      return t('현재 searchMatchFound: {{value}}', {
        value: snapshot.searchMatchFound === null ? '-' : snapshot.searchMatchFound ? 'yes' : 'no',
      });
    case 'shellHistoryText': {
      const expected = typeof rule.value === 'string' ? rule.value : null;
      if (!expected) {
        return t('최근 명령 {{count}}개', { count: snapshot.commandHistory.length });
      }
      const found = snapshot.commandHistory.some((command) => command.includes(expected));
      return found
        ? t('최근 명령에서 "{{expected}}" 확인됨', { expected })
        : t('최근 명령에서 "{{expected}}" 미확인', { expected });
    }
    case 'actionHistoryText': {
      const expected = typeof rule.value === 'string' ? rule.value : null;
      if (!expected) {
        return t('최근 액션 {{count}}개', { count: snapshot.actionHistory.length });
      }
      const found = snapshot.actionHistory.some((action) => action.includes(expected));
      return found
        ? t('최근 액션에서 "{{expected}}" 확인됨', { expected })
        : t('최근 액션에서 "{{expected}}" 미확인', { expected });
    }
    default:
      return t('현재 상태 측정값 없음');
  }
}

function getInitialScenarioLabel(t: TFunction, initialScenario: string) {
  switch (initialScenario) {
    case 'single-pane':
      return t('초기 시나리오: 단일 pane에서 시작');
    case 'log-buffer':
      return t('초기 시나리오: 로그 버퍼가 준비된 pane에서 시작');
    default:
      return t('초기 시나리오: {{initialScenario}}', { initialScenario });
  }
}

function buildMissionPreconditionItems(t: TFunction, mission: AppMission | null, snapshot: VmBridgeSnapshot): MissionPreconditionItem[] {
  if (!mission) {
    return [];
  }

  const ruleItems = mission.passRules.map<MissionPreconditionItem>((rule, index) => {
    const actual = getRuleMetricValue(snapshot, rule.kind);
    const satisfied = actual !== null && actual !== undefined && evaluateRuleOperator(actual, rule.operator, rule.value);

    return {
      key: `${rule.kind}-${index}`,
      label: getRulePreconditionLabel(t, rule),
      current: getRuleCurrentStateText(t, rule, snapshot),
      satisfied,
    };
  });

  return [
    {
      key: 'initial-scenario',
      label: getInitialScenarioLabel(t, mission.initialScenario),
      current: t('미션 진입 시 자동 적용'),
      satisfied: true,
    },
    ...ruleItems,
  ];
}

function computeCompletedTrackSlugs(content: AppContent, completedMissionSlugs: string[]) {
  const completedSet = new Set(completedMissionSlugs);
  const lessonTrackMap = new Map(content.lessons.map((lesson) => [lesson.slug, lesson.trackSlug]));

  return content.tracks
    .filter((track) => {
      const trackMissionSlugs = content.missions
        .filter((mission) => lessonTrackMap.get(mission.lessonSlug) === track.slug)
        .map((mission) => mission.slug);

      if (trackMissionSlugs.length === 0) {
        return false;
      }

      return trackMissionSlugs.every((slug) => completedSet.has(slug));
    })
    .map((track) => track.slug);
}

function createInitialMetrics(): VmMetricState {
  return {
    sessionCount: null,
    windowCount: null,
    paneCount: null,
    modeIs: null,
    sessionName: null,
    activeWindowIndex: null,
    windowLayout: null,
    windowZoomed: null,
    paneSynchronized: null,
    searchExecuted: null,
    searchMatchFound: null,
  };
}

function formatLayout(layout: string | null) {
  if (!layout) {
    return '-';
  }

  if (layout.length <= 28) {
    return layout;
  }

  return `${layout.slice(0, 28)}...`;
}

function getLessonStatusLabel(t: TFunction, status: LessonCompletionStatus) {
  switch (status) {
    case 'completed':
      return t('완료');
    case 'in-progress':
      return t('진행중');
    case 'not-started':
    default:
      return t('미시작');
  }
}

function getLessonStatusClass(status: LessonCompletionStatus) {
  switch (status) {
    case 'completed':
      return 'is-complete';
    case 'in-progress':
      return 'is-in-progress';
    case 'not-started':
    default:
      return 'is-not-started';
  }
}

function formatUnlockedTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PracticeVmPocPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contentState, setContentState] = useState<{
    status: 'loading' | 'ready' | 'error';
    content: AppContent | null;
  }>({
    status: 'loading',
    content: null,
  });

  const [selectedLessonSlug, setSelectedLessonSlug] = useState('');
  const [selectedMissionSlug, setSelectedMissionSlug] = useState('');
  const [vmEpoch, setVmEpoch] = useState(0);
  const [vmStatus, setVmStatus] = useState<VmStatus>('idle');
  const [vmStatusText, setVmStatusText] = useState(t('대기 중'));
  const [commandInput, setCommandInput] = useState('tmux list-sessions');
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [actionHistory, setActionHistory] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<VmMetricState>(createInitialMetrics());
  const [achievementFeed, setAchievementFeed] = useState<AchievementFeedEntry[]>([]);
  const [achievementUnreadCount, setAchievementUnreadCount] = useState(0);
  const [achievementLiveMessage, setAchievementLiveMessage] = useState('');
  const [missionCompletionMessage, setMissionCompletionMessage] = useState('');
  const [autoProbe, setAutoProbe] = useState(true);
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>('all');
  const [mobileWorkbenchView, setMobileWorkbenchView] = useState<'mission' | 'terminal'>('terminal');

  const completedMissionSlugs = useProgressStore((store) => store.completedMissionSlugs);
  const unlockedAchievements = useProgressStore((store) => store.unlockedAchievements);
  const recordMissionPass = useProgressStore((store) => store.recordMissionPass);
  const recordTmuxActivity = useProgressStore((store) => store.recordTmuxActivity);
  const startMissionSession = useProgressStore((store) => store.startMissionSession);

  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const emulatorRef = useRef<V86 | null>(null);
  const inputLineBufferRef = useRef('');
  const inputEscapeSequenceRef = useRef(false);
  const outputEscapeSequenceRef = useRef(false);
  const lineBufferRef = useRef('');
  const probeLineBufferRef = useRef('');
  const autoProbeRef = useRef(autoProbe);
  const celebratedMissionSetRef = useRef(new Set<string>());
  const seenAchievementIdsRef = useRef(new Set<string>());
  const lastEmulatorOptionsRef = useRef<V86Options | null>(null);
  const vmInternalBridgeReadyRef = useRef(false);
  const vmWarmBannerPendingRef = useRef(false);
  const selectedLessonSlugRef = useRef(selectedLessonSlug);
  const recordTmuxActivityRef = useRef(recordTmuxActivity);
  const metricsRef = useRef<VmMetricState>(createInitialMetrics());
  const shortcutTelemetryStateRef = useRef(createTmuxShortcutTelemetryState());
  const searchProbeTimerRef = useRef<number | null>(null);
  const achievementAnnounceTimerRef = useRef<number | null>(null);
  const pendingAchievementIdsRef = useRef(new Set<string>());

  const lessonParam = searchParams.get('lesson') ?? '';
  const missionParam = searchParams.get('mission') ?? '';
  const warmParam = searchParams.get('warm') ?? '';
  const disableWarmStart = warmParam === '0' || warmParam.toLowerCase() === 'off';

  const content = contentState.content;
  const trackTitleMap = useMemo(() => {
    if (!content) {
      return new Map<string, string>();
    }

    return new Map(content.tracks.map((track) => [track.slug, track.title]));
  }, [content]);
  const chapterTitleMap = useMemo(() => {
    if (!content) {
      return new Map<string, string>();
    }

    return new Map(content.chapters.map((chapter) => [chapter.slug, chapter.title]));
  }, [content]);
  const lessonProgressRows = useMemo(() => {
    if (!content) {
      return [];
    }

    return buildLessonProgressRows(content, completedMissionSlugs);
  }, [completedMissionSlugs, content]);
  const filteredLessonRows = useMemo(
    () => filterLessonProgressRows(lessonProgressRows, lessonFilter),
    [lessonFilter, lessonProgressRows],
  );

  const lessonMissions = useMemo(() => {
    if (!content || !selectedLessonSlug) {
      return [];
    }

    return content.missions.filter((mission) => mission.lessonSlug === selectedLessonSlug);
  }, [content, selectedLessonSlug]);

  const selectedMission = useMemo(() => {
    if (!selectedMissionSlug) {
      return null;
    }

    return lessonMissions.find((mission) => mission.slug === selectedMissionSlug) ?? null;
  }, [lessonMissions, selectedMissionSlug]);

  const vmSnapshot = useMemo(
    () => ({
      sessionCount: metrics.sessionCount,
      windowCount: metrics.windowCount,
      paneCount: metrics.paneCount,
      modeIs: metrics.modeIs,
      sessionName: metrics.sessionName,
      activeWindowIndex: metrics.activeWindowIndex,
      windowLayout: metrics.windowLayout,
      windowZoomed: metrics.windowZoomed,
      paneSynchronized: metrics.paneSynchronized,
      searchExecuted: metrics.searchExecuted,
      searchMatchFound: metrics.searchMatchFound,
      actionHistory,
      commandHistory,
    }),
    [actionHistory, commandHistory, metrics],
  );

  const selectedMissionStatus = useMemo(() => {
    if (!selectedMission) {
      return null;
    }

    return evaluateMissionWithVmSnapshot(selectedMission, vmSnapshot);
  }, [selectedMission, vmSnapshot]);

  const selectedLesson = useMemo(() => {
    if (!content || !selectedLessonSlug) {
      return null;
    }

    return content.lessons.find((lesson) => lesson.slug === selectedLessonSlug) ?? null;
  }, [content, selectedLessonSlug]);
  const selectedLessonPracticeType = selectedLesson ? resolveLessonPracticeType(selectedLesson) : 'mission';
  const selectedLessonIsGuide = selectedLessonPracticeType === 'guide';
  const selectedGuideSymptoms = selectedLesson?.guide?.symptoms ?? selectedLesson?.failureStates ?? [];
  const selectedGuideChecks = selectedLesson?.guide?.checks ?? [];
  const selectedGuideWorkarounds = selectedLesson?.guide?.workarounds ?? [];
  const selectedGuideChecklist = selectedLesson?.guide?.checklist ?? selectedLesson?.successCriteria ?? [];
  const selectedGuideCommands = selectedLesson?.guide?.commands ?? [];

  const selectedLessonTrack = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    return content.tracks.find((track) => track.slug === selectedLesson.trackSlug) ?? null;
  }, [content, selectedLesson]);

  const selectedLessonChapter = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    return content.chapters.find((chapter) => chapter.slug === selectedLesson.chapterSlug) ?? null;
  }, [content, selectedLesson]);

  const missionStatusMap = useMemo(() => {
    const result = new Map<string, ReturnType<typeof evaluateMissionWithVmSnapshot>>();

    lessonMissions.forEach((mission) => {
      result.set(mission.slug, evaluateMissionWithVmSnapshot(mission, vmSnapshot));
    });

    return result;
  }, [lessonMissions, vmSnapshot]);

  const lessonCompletedMissionCount = useMemo(() => {
    const completedSet = new Set(completedMissionSlugs);
    return lessonMissions.filter((mission) => completedSet.has(mission.slug)).length;
  }, [completedMissionSlugs, lessonMissions]);

  const manualMissionCandidates = useMemo(() => {
    return lessonMissions.filter((mission) => missionStatusMap.get(mission.slug)?.status === 'manual');
  }, [lessonMissions, missionStatusMap]);

  const selectedMissionIndex = useMemo(() => {
    if (!selectedMission) {
      return -1;
    }
    return lessonMissions.findIndex((mission) => mission.slug === selectedMission.slug);
  }, [lessonMissions, selectedMission]);

  const selectedMissionOrder = selectedMissionIndex >= 0 ? selectedMissionIndex + 1 : null;

  const previousMissionInLesson = selectedMissionIndex > 0 ? lessonMissions[selectedMissionIndex - 1] : null;
  const nextMissionInLesson =
    selectedMissionIndex >= 0 && selectedMissionIndex < lessonMissions.length - 1
      ? lessonMissions[selectedMissionIndex + 1]
      : null;

  const previousLesson = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    const index = content.lessons.findIndex((lesson) => lesson.slug === selectedLesson.slug);
    if (index <= 0) {
      return null;
    }

    return content.lessons[index - 1] ?? null;
  }, [content, selectedLesson]);

  const nextLesson = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    const index = content.lessons.findIndex((lesson) => lesson.slug === selectedLesson.slug);
    if (index === -1) {
      return null;
    }

    return content.lessons[index + 1] ?? null;
  }, [content, selectedLesson]);

  const selectedMissionCompleted = useMemo(() => {
    if (!selectedMission) {
      return false;
    }
    return completedMissionSlugs.includes(selectedMission.slug);
  }, [completedMissionSlugs, selectedMission]);
  const firstIncompleteMissionInLesson = useMemo(() => {
    return lessonMissions.find((mission) => !completedMissionSlugs.includes(mission.slug)) ?? null;
  }, [completedMissionSlugs, lessonMissions]);

  const nextIncompleteMission = useMemo(() => {
    if (!selectedMission) {
      return firstIncompleteMissionInLesson;
    }

    const index = lessonMissions.findIndex((mission) => mission.slug === selectedMission.slug);
    if (index === -1) {
      return firstIncompleteMissionInLesson;
    }

    for (let cursor = index + 1; cursor < lessonMissions.length; cursor += 1) {
      const mission = lessonMissions[cursor];
      if (!completedMissionSlugs.includes(mission.slug)) {
        return mission;
      }
    }

    if (firstIncompleteMissionInLesson?.slug === selectedMission.slug) {
      return null;
    }
    return firstIncompleteMissionInLesson;
  }, [completedMissionSlugs, firstIncompleteMissionInLesson, lessonMissions, selectedMission]);

  const lessonCompleted = lessonMissions.length > 0 && lessonCompletedMissionCount === lessonMissions.length;

  const selectLessonForAction = useCallback(
    (lessonSlug: string, options?: { resetFilter?: boolean }) => {
      if (!content) {
        return;
      }

      if (!content.lessons.some((lesson) => lesson.slug === lessonSlug)) {
        return;
      }

      if (options?.resetFilter) {
        setLessonFilter('all');
      }

      const nextLessonMissions = content.missions.filter((mission) => mission.lessonSlug === lessonSlug);
      const nextMissionSlug = resolveDefaultMissionSlugForLesson(nextLessonMissions, completedMissionSlugs);
      setSelectedLessonSlug(lessonSlug);
      setSelectedMissionSlug(nextMissionSlug);
      if (nextMissionSlug) {
        startMissionSession({
          missionSlug: nextMissionSlug,
          lessonSlug,
        });
      }
      setMobileWorkbenchView('mission');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [completedMissionSlugs, content, startMissionSession],
  );

  const selectMissionForAction = useCallback(
    (missionSlug: string) => {
      setSelectedMissionSlug(missionSlug);
      startMissionSession({
        missionSlug,
        lessonSlug: selectedLessonSlugRef.current,
      });
      setMobileWorkbenchView('mission');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [startMissionSession],
  );

  const selectNextLessonForAction = useCallback(() => {
    if (!content || !nextLesson) {
      return;
    }

    setSelectedLessonSlug(nextLesson.slug);
    const nextLessonMissions = content.missions.filter((mission) => mission.lessonSlug === nextLesson.slug);
    const nextMissionSlug = resolveDefaultMissionSlugForLesson(nextLessonMissions, completedMissionSlugs);
    setSelectedMissionSlug(nextMissionSlug);
    if (nextMissionSlug) {
      startMissionSession({
        missionSlug: nextMissionSlug,
        lessonSlug: nextLesson.slug,
      });
    }
    setMobileWorkbenchView('mission');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [completedMissionSlugs, content, nextLesson, startMissionSession]);

  const selectPreviousLessonForAction = useCallback(() => {
    if (!content || !previousLesson) {
      return;
    }

    setSelectedLessonSlug(previousLesson.slug);
    const previousLessonMissions = content.missions.filter((mission) => mission.lessonSlug === previousLesson.slug);
    const nextMissionSlug = resolveDefaultMissionSlugForLesson(previousLessonMissions, completedMissionSlugs);
    setSelectedMissionSlug(nextMissionSlug);
    if (nextMissionSlug) {
      startMissionSession({
        missionSlug: nextMissionSlug,
        lessonSlug: previousLesson.slug,
      });
    }
    setMobileWorkbenchView('mission');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [completedMissionSlugs, content, previousLesson, startMissionSession]);

  const markAchievementFeedAsRead = useCallback(() => {
    setAchievementUnreadCount(0);
  }, []);

  const announceAchievements = useCallback(
    (achievementIds: string[]) => {
      const uniqueIds = Array.from(new Set(achievementIds));
      const definitions = uniqueIds
        .map((achievementId) => getAchievementDefinition(achievementId))
        .filter((definition): definition is NonNullable<ReturnType<typeof getAchievementDefinition>> =>
          Boolean(definition),
        );

      if (definitions.length === 0) {
        return;
      }

      const unseenDefinitions = definitions.filter(
        (definition) => !seenAchievementIdsRef.current.has(definition.id),
      );
      if (unseenDefinitions.length === 0) {
        return;
      }

      unseenDefinitions.forEach((definition) => {
        seenAchievementIdsRef.current.add(definition.id);
      });

      setClarityTag('achievementUnlockedCount', String(unseenDefinitions.length));
      trackClarityEvent('practice_achievement_unlocked');

      const nowIso = new Date().toISOString();
      setAchievementFeed((previous) => {
        const nextFeed = [...previous];
        unseenDefinitions.forEach((definition) => {
          const existingIndex = nextFeed.findIndex((entry) => entry.id === definition.id);
          if (existingIndex !== -1) {
            nextFeed.splice(existingIndex, 1);
          }
          nextFeed.unshift({
            id: definition.id,
            title: definition.title,
            description: definition.description,
            unlockedAt: nowIso,
          });
        });
        return nextFeed.slice(0, MAX_ACHIEVEMENT_FEED_ITEMS);
      });
      setAchievementUnreadCount((count) => count + unseenDefinitions.length);
      setAchievementLiveMessage(
        unseenDefinitions.length === 1
          ? t('업적 달성: {{title}}', { title: unseenDefinitions[0].title })
          : t('업적 {{count}}개 달성', { count: unseenDefinitions.length }),
      );
    },
    [t],
  );

  const scheduleAchievementAnnouncements = useCallback(
    (achievementIds: string[]) => {
      if (achievementIds.length === 0) {
        return;
      }

      achievementIds.forEach((achievementId) => {
        pendingAchievementIdsRef.current.add(achievementId);
      });

      if (achievementAnnounceTimerRef.current !== null) {
        return;
      }

      achievementAnnounceTimerRef.current = window.setTimeout(() => {
        achievementAnnounceTimerRef.current = null;
        const pendingIds = Array.from(pendingAchievementIdsRef.current);
        pendingAchievementIdsRef.current.clear();
        announceAchievements(pendingIds);
      }, ACHIEVEMENT_FEED_BATCH_DELAY_MS);
    },
    [announceAchievements],
  );

  const clearScheduledAchievementAnnouncements = useCallback(() => {
    if (achievementAnnounceTimerRef.current !== null) {
      window.clearTimeout(achievementAnnounceTimerRef.current);
      achievementAnnounceTimerRef.current = null;
    }
    pendingAchievementIdsRef.current.clear();
  }, []);

  useEffect(() => {
    autoProbeRef.current = autoProbe;
  }, [autoProbe]);

  useEffect(() => {
    selectedLessonSlugRef.current = selectedLessonSlug;
  }, [selectedLessonSlug]);

  useEffect(() => {
    return clearScheduledAchievementAnnouncements;
  }, [clearScheduledAchievementAnnouncements]);

  useEffect(() => {
    recordTmuxActivityRef.current = recordTmuxActivity;
  }, [recordTmuxActivity]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    if (!achievementLiveMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAchievementLiveMessage('');
    }, 2600);
    return () => {
      window.clearTimeout(timer);
    };
  }, [achievementLiveMessage]);

  useEffect(() => {
    if (!missionCompletionMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMissionCompletionMessage('');
    }, 3600);
    return () => {
      window.clearTimeout(timer);
    };
  }, [missionCompletionMessage]);

  useEffect(() => {
    let isMounted = true;

    loadAppContent()
      .then((nextContent) => {
        if (!isMounted) {
          return;
        }

        setContentState({
          status: 'ready',
          content: nextContent,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setContentState({
          status: 'error',
          content: null,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!content || selectedLessonSlug) {
      return;
    }

    setSelectedLessonSlug(resolveInitialLessonSlugFromQuery(content, lessonParam, missionParam));
  }, [content, lessonParam, missionParam, selectedLessonSlug]);

  useEffect(() => {
    if (!content || !selectedLessonSlug || filteredLessonRows.length === 0) {
      return;
    }

    if (filteredLessonRows.some((row) => row.lesson.slug === selectedLessonSlug)) {
      return;
    }

    const nextLessonSlug = filteredLessonRows[0].lesson.slug;
    const nextLessonMissions = content.missions.filter((mission) => mission.lessonSlug === nextLessonSlug);
    setSelectedLessonSlug(nextLessonSlug);
    setSelectedMissionSlug(resolveDefaultMissionSlugForLesson(nextLessonMissions, completedMissionSlugs));
  }, [completedMissionSlugs, content, filteredLessonRows, selectedLessonSlug]);

  useEffect(() => {
    if (!content || !selectedLessonSlug) {
      return;
    }

    const missions = content.missions.filter((mission) => mission.lessonSlug === selectedLessonSlug);

    if (missions.length === 0) {
      if (selectedMissionSlug) {
        setSelectedMissionSlug('');
      }
      return;
    }

    if (missions.some((mission) => mission.slug === selectedMissionSlug)) {
      return;
    }

    const fromParam = missions.some((mission) => mission.slug === missionParam) ? missionParam : '';
    setSelectedMissionSlug(fromParam || resolveDefaultMissionSlugForLesson(missions, completedMissionSlugs));
  }, [completedMissionSlugs, content, missionParam, selectedLessonSlug, selectedMissionSlug]);

  useEffect(() => {
    if (!selectedLessonSlug || !selectedMissionSlug) {
      return;
    }

    if (completedMissionSlugs.includes(selectedMissionSlug)) {
      return;
    }

    startMissionSession({
      missionSlug: selectedMissionSlug,
      lessonSlug: selectedLessonSlug,
    });
  }, [completedMissionSlugs, selectedLessonSlug, selectedMissionSlug, startMissionSession]);

  useEffect(() => {
    if (!selectedLessonSlug) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    if (nextParams.get('lesson') !== selectedLessonSlug) {
      nextParams.set('lesson', selectedLessonSlug);
      changed = true;
    }

    if (selectedMissionSlug) {
      if (nextParams.get('mission') !== selectedMissionSlug) {
        nextParams.set('mission', selectedMissionSlug);
        changed = true;
      }
    } else if (nextParams.has('mission')) {
      nextParams.delete('mission');
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, selectedLessonSlug, selectedMissionSlug, setSearchParams]);

  useEffect(() => {
    if (!selectedLessonSlug) {
      return;
    }
    setClarityTag('practiceLesson', selectedLessonSlug);
  }, [selectedLessonSlug]);

  useEffect(() => {
    if (!selectedMissionSlug) {
      return;
    }
    setClarityTag('practiceMission', selectedMissionSlug);
  }, [selectedMissionSlug]);

  const pushDebugLine = useCallback((line: string) => {
    const normalized = line.trimEnd();
    if (!normalized) {
      return;
    }

    setDebugLines((previous) => trimHistory([...previous, normalized], MAX_DEBUG_LINES));
  }, []);

  const updateMetricByProbe = useCallback(
    (metric: VmProbeMetric) => {
      setVmStatus('running');
      setVmStatusText(t('부팅 완료, 명령 입력 가능'));

      setMetrics((previous) => {
        switch (metric.key) {
          case 'session':
            return {
              ...previous,
              sessionCount: metric.value >= 0 ? metric.value : null,
            };
          case 'window':
            return {
              ...previous,
              windowCount: metric.value >= 0 ? metric.value : null,
            };
          case 'pane':
            return {
              ...previous,
              paneCount: metric.value >= 0 ? metric.value : null,
            };
          case 'mode':
            return {
              ...previous,
              modeIs: metric.value === 1 ? 'COPY_MODE' : null,
            };
          case 'sessionName':
            return {
              ...previous,
              sessionName: metric.value.trim() || null,
            };
          case 'activeWindow':
            return {
              ...previous,
              activeWindowIndex: metric.value >= 0 ? metric.value : null,
            };
          case 'layout':
            return {
              ...previous,
              windowLayout: metric.value.trim() || null,
            };
          case 'zoomed':
            return {
              ...previous,
              windowZoomed: metric.value === 1,
            };
          case 'sync':
            return {
              ...previous,
              paneSynchronized: metric.value === 1,
            };
          case 'search':
            return {
              ...previous,
              searchExecuted: metric.value === 1,
            };
          case 'searchMatched':
            return {
              ...previous,
              searchMatchFound: metric.value === 1,
            };
          default:
            return previous;
        }
      });

      if (metric.key === 'pane' || metric.key === 'layout' || metric.key === 'zoomed' || metric.key === 'sync') {
        const nextPaneCount = metric.key === 'pane' ? (metric.value >= 0 ? metric.value : null) : undefined;
        const nextLayout = metric.key === 'layout' ? metric.value.trim() || null : undefined;
        const nextZoomed = metric.key === 'zoomed' ? metric.value === 1 : undefined;
        const nextSynchronized = metric.key === 'sync' ? metric.value === 1 : undefined;
        const unlocked = recordTmuxActivityRef.current({
          actions: [],
          paneCount: nextPaneCount,
          windowLayout: nextLayout,
          windowZoomed: nextZoomed,
          paneSynchronized: nextSynchronized,
          lessonSlug: selectedLessonSlugRef.current,
        });
        if (unlocked.length > 0) {
          scheduleAchievementAnnouncements(unlocked);
        }
      }
    },
    [scheduleAchievementAnnouncements, t],
  );

  const sendInternalCommand = useCallback((command: string) => {
    const normalized = command.trim();
    if (!normalized || !emulatorRef.current) {
      return;
    }

    const payload = new TextEncoder().encode(`${normalized}\n`);
    emulatorRef.current.serial_send_bytes(2, payload);
  }, []);

  const requestSearchProbe = useCallback(() => {
    if (!emulatorRef.current || !vmInternalBridgeReadyRef.current) {
      return;
    }

    if (searchProbeTimerRef.current !== null) {
      window.clearTimeout(searchProbeTimerRef.current);
    }

    searchProbeTimerRef.current = window.setTimeout(() => {
      searchProbeTimerRef.current = null;
      sendInternalCommand(SEARCH_PROBE_TRIGGER_COMMAND);
    }, 140);
  }, [sendInternalCommand]);

  const registerCommand = useCallback(
    (
      command: string,
      options?: {
        source?: 'shell' | 'shortcut';
        extraActions?: string[];
      },
    ) => {
      const normalizedCommand = command.trim();
      if (!normalizedCommand) {
        return;
      }

      const source = options?.source ?? 'shell';
      setCommandHistory((previous) => appendHistory(previous, normalizedCommand, MAX_HISTORY));

      const actions = parseTmuxActionsFromCommand(normalizedCommand);
      if (options?.extraActions && options.extraActions.length > 0) {
        actions.push(...options.extraActions);
      }
      if (source === 'shortcut') {
        actions.push('sim.shortcut.execute');
      }

      if (actions.length > 0) {
        const uniqueActions = Array.from(new Set(actions));
        setActionHistory((previous) => appendActions(previous, uniqueActions, MAX_HISTORY));

        const unlocked = recordTmuxActivityRef.current({
          actions: uniqueActions,
          lessonSlug: selectedLessonSlugRef.current,
        });
        if (unlocked.length > 0) {
          scheduleAchievementAnnouncements(unlocked);
        }
      }

      const lower = normalizedCommand.toLowerCase();

      if (/\btmux\s+copy-mode\b/.test(lower)) {
        setMetrics((previous) => ({
          ...previous,
          modeIs: 'COPY_MODE',
        }));
      }

      if (/(search-forward|search-backward|search -)/.test(lower) || /send-keys\s+.*-x\s+search/.test(lower)) {
        setMetrics((previous) => ({
          ...previous,
          searchExecuted: true,
        }));
        requestSearchProbe();
      }
    },
    [requestSearchProbe, scheduleAchievementAnnouncements],
  );

  const completeSelectedMission = useCallback(
    (mode: 'auto' | 'manual') => {
      if (!content || !selectedMission || !selectedLesson) {
        return;
      }

      const missionSlug = selectedMission.slug;
      if (completedMissionSlugs.includes(missionSlug)) {
        return;
      }

      const previousUnlockedSet = new Set(unlockedAchievements);
      const nextCompletedMissionSlugs = [...completedMissionSlugs, missionSlug];
      const completedTrackSlugs = computeCompletedTrackSlugs(content, nextCompletedMissionSlugs);

      recordMissionPass({
        missionSlug,
        difficulty: selectedMission.difficulty,
        hintLevel: mode === 'manual' ? 1 : 0,
        attemptNumber: 1,
        completedTrackSlugs,
      });

      const completedSetBefore = new Set(completedMissionSlugs);
      const completedSetAfter = new Set(nextCompletedMissionSlugs);
      const lessonWasCompleted =
        lessonMissions.length > 0 && lessonMissions.every((mission) => completedSetBefore.has(mission.slug));
      const lessonNowCompleted =
        lessonMissions.length > 0 && lessonMissions.every((mission) => completedSetAfter.has(mission.slug));
      const lessonJustCompleted = !lessonWasCompleted && lessonNowCompleted;
      const nextMissionAfterCompletion = lessonMissions.find((mission) => !completedSetAfter.has(mission.slug)) ?? null;

      if (lessonJustCompleted) {
        trackClarityEvent('practice_lesson_completed');
      } else {
        trackClarityEvent(mode === 'manual' ? 'practice_mission_completed_manual' : 'practice_mission_completed_auto');
      }

      const newlyUnlocked = useProgressStore
        .getState()
        .unlockedAchievements.filter((achievementId) => !previousUnlockedSet.has(achievementId));

      if (newlyUnlocked.length > 0) {
        scheduleAchievementAnnouncements(newlyUnlocked);
      }

      setMissionCompletionMessage(
        !lessonJustCompleted && nextMissionAfterCompletion
          ? t('미션 완료: {{title}} · 자동으로 다음 미션으로 이동했습니다.', {
              title: t(selectedMission.title),
            })
          : t('미션 완료: {{title}}', {
              title: t(selectedMission.title),
            }),
      );

      if (!lessonJustCompleted && nextMissionAfterCompletion) {
        setSelectedMissionSlug(nextMissionAfterCompletion.slug);
        startMissionSession({
          missionSlug: nextMissionAfterCompletion.slug,
          lessonSlug: selectedLesson.slug,
        });
      }
    },
    [
      completedMissionSlugs,
      content,
      lessonMissions,
      recordMissionPass,
      scheduleAchievementAnnouncements,
      selectedLesson,
      selectedMission,
      startMissionSession,
      t,
      unlockedAchievements,
    ],
  );

  const captureInteractiveCommandInput = useCallback(
    (data: string) => {
      for (const char of data) {
        if (inputEscapeSequenceRef.current) {
          if (char >= '@' && char <= '~') {
            inputEscapeSequenceRef.current = false;
          }
          continue;
        }

        if (char === '\u001b') {
          inputEscapeSequenceRef.current = true;
          continue;
        }

        if (char === '\r' || char === '\n') {
          const command = inputLineBufferRef.current.trim();
          inputLineBufferRef.current = '';
          if (command) {
            registerCommand(command, { source: 'shell' });
          }
          continue;
        }

        if (char === '\u0003' || char === '\u0004' || char === '\u0015') {
          inputLineBufferRef.current = '';
          continue;
        }

        if (char === '\b' || char === String.fromCharCode(127)) {
          inputLineBufferRef.current = inputLineBufferRef.current.slice(0, -1);
          continue;
        }

        if (char >= ' ') {
          inputLineBufferRef.current += char;
        }
      }
    },
    [registerCommand],
  );

  const sendCommand = useCallback(
    (command: string, options?: { trackCommand?: boolean }) => {
      const normalized = command.trim();
      if (!normalized || !emulatorRef.current) {
        return;
      }

      emulatorRef.current.serial0_send(`${normalized}\n`);

      const trackCommand = options?.trackCommand ?? true;

      if (trackCommand) {
        registerCommand(normalized, { source: 'shell' });
      }
    },
    [registerCommand],
  );

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return undefined;
    }

    window.__tmuxwebVmBridge = {
      isReady: () => Boolean(emulatorRef.current),
      getStatus: () => ({
        status: vmStatus,
        text: vmStatusText,
        metrics,
        actionHistory,
        commandHistory,
        debugLineCount: debugLines.length,
        lastDebugLine: debugLines.length > 0 ? debugLines[debugLines.length - 1] : null,
      }),
      saveState: async () => {
        const emulator = emulatorRef.current as (V86 & { save_state?: () => Promise<ArrayBuffer> | ArrayBuffer }) | null;
        if (!emulator || typeof emulator.save_state !== 'function') {
          return null;
        }

        const state = await emulator.save_state();
        return state instanceof ArrayBuffer ? state : null;
      },
      sendProbe: () => {
        sendInternalCommand(PROBE_TRIGGER_COMMAND);
      },
      sendCommand: (command: string) => {
        sendCommand(command);
      },
      getBootConfig: () => VM_BOOT_CONFIG,
      getLastEmulatorOptions: () => lastEmulatorOptionsRef.current,
    };

    return () => {
      delete window.__tmuxwebVmBridge;
    };
  }, [actionHistory, commandHistory, debugLines, metrics, sendCommand, sendInternalCommand, vmStatus, vmStatusText]);

  useEffect(() => {
    if (!vmInternalBridgeReadyRef.current || !emulatorRef.current) {
      return;
    }

    if (autoProbe) {
      sendInternalCommand(PROBE_LOOP_START_COMMAND);
      sendInternalCommand(PROBE_TRIGGER_COMMAND);
      return;
    }

    sendInternalCommand(PROBE_LOOP_STOP_COMMAND);
  }, [autoProbe, sendInternalCommand]);

  useEffect(() => {
    if (contentState.status !== 'ready') {
      return undefined;
    }

    let isMounted = true;
    let serialListener: ((value?: unknown) => void) | null = null;
    let serialProbeListener: ((value?: unknown) => void) | null = null;
    let loadedListener: ((value?: unknown) => void) | null = null;
    let stopListener: ((value?: unknown) => void) | null = null;

    setVmStatus('booting');
    setVmStatusText(t('v86 초기화 중'));

    const host = terminalHostRef.current;
    if (!host) {
      setVmStatus('error');
      setVmStatusText(t('터미널 DOM 초기화 실패'));
      return undefined;
    }

    const initialMetrics = createInitialMetrics();
    setMetrics(initialMetrics);
    metricsRef.current = initialMetrics;
    setActionHistory([]);
    setCommandHistory([]);
    setDebugLines([]);
    setAchievementFeed([]);
    setAchievementUnreadCount(0);
    setAchievementLiveMessage('');
    setMissionCompletionMessage('');
    seenAchievementIdsRef.current.clear();
    inputLineBufferRef.current = '';
    inputEscapeSequenceRef.current = false;
    outputEscapeSequenceRef.current = false;
    lineBufferRef.current = '';
    probeLineBufferRef.current = '';
    vmInternalBridgeReadyRef.current = false;
    vmWarmBannerPendingRef.current = false;
    shortcutTelemetryStateRef.current = createTmuxShortcutTelemetryState();
    if (searchProbeTimerRef.current !== null) {
      window.clearTimeout(searchProbeTimerRef.current);
      searchProbeTimerRef.current = null;
    }
    clearScheduledAchievementAnnouncements();

    const terminal = new Terminal({
      cursorBlink: true,
      cols: DEFAULT_TERMINAL_COLS,
      rows: DEFAULT_TERMINAL_ROWS,
      fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#020617',
        foreground: '#dbeafe',
        cursor: '#f8fafc',
      },
    });

    terminal.open(host);
    terminal.focus();

    terminalRef.current = terminal;

    const dataDisposable = terminal.onData((data) => {
      if (!emulatorRef.current) {
        return;
      }

      const shortcutTelemetry = parseTmuxShortcutTelemetry(data, shortcutTelemetryStateRef.current, {
        inCopyMode: metricsRef.current.modeIs === 'COPY_MODE',
      });
      shortcutTelemetry.syntheticCommands.forEach((shortcutEvent) => {
        registerCommand(shortcutEvent.command, {
          source: 'shortcut',
          extraActions: [shortcutEvent.shortcutAction],
        });
      });
      if (shortcutTelemetry.shouldProbeSearch) {
        setMetrics((previous) => ({
          ...previous,
          searchExecuted: true,
        }));
        requestSearchProbe();
      }

      captureInteractiveCommandInput(data);
      emulatorRef.current.serial0_send(data);
    });

    const writeByte = (value: number) => {
      terminal.write(Uint8Array.of(value & 0xff));

      const char = String.fromCharCode(value & 0xff);

      if (outputEscapeSequenceRef.current) {
        if (char >= '@' && char <= '~') {
          outputEscapeSequenceRef.current = false;
        }
        return;
      }

      if (char === '\u001b') {
        outputEscapeSequenceRef.current = true;
        return;
      }

      if (char === '\r') {
        return;
      }

      if (char === '\n') {
        const completedLine = lineBufferRef.current;
        lineBufferRef.current = '';

        const probeMetric = parseProbeMetricFromLine(completedLine);
        if (probeMetric) {
          updateMetricByProbe(probeMetric);
          return;
        }

        pushDebugLine(completedLine);

        const plainLine = stripAnsi(completedLine).replace(/\r/g, '');
        const normalizedLine = plainLine.toLowerCase();
        const hasShellPrompt = /[#$]\s*$/.test(plainLine.trimEnd());
        if (normalizedLine.includes('login:') || hasShellPrompt) {
          setVmStatusText(t('부팅 완료, 명령 입력 가능'));
          setVmStatus('running');
        }

        if (hasShellPrompt && !vmInternalBridgeReadyRef.current && emulatorRef.current) {
          vmInternalBridgeReadyRef.current = true;
          if (vmWarmBannerPendingRef.current) {
            emulatorRef.current.serial0_send(`${BANNER_TRIGGER_COMMAND}\n`);
            vmWarmBannerPendingRef.current = false;
          }
          sendInternalCommand(TERMINAL_GEOMETRY_SYNC_COMMAND);
          if (autoProbeRef.current) {
            sendInternalCommand(PROBE_LOOP_START_COMMAND);
          }
          sendInternalCommand(PROBE_TRIGGER_COMMAND);
        }
        return;
      }

      if (char === '\b' || char === String.fromCharCode(127)) {
        lineBufferRef.current = lineBufferRef.current.slice(0, -1);
        return;
      }

      if (char >= ' ') {
        lineBufferRef.current += char;
      }
    };

    const writeProbeByte = (value: number) => {
      const char = String.fromCharCode(value & 0xff);
      if (char === '\r') {
        return;
      }

      if (char === '\n') {
        const completedLine = probeLineBufferRef.current;
        probeLineBufferRef.current = '';
        const probeMetric = parseProbeMetricFromLine(completedLine);
        if (probeMetric) {
          updateMetricByProbe(probeMetric);
        }
        return;
      }

      if (char >= ' ') {
        probeLineBufferRef.current += char;
      }
    };

    (async () => {
      try {
        const module = await import('v86');
        if (!isMounted) {
          return;
        }

        const V86Ctor = module.default;
        setVmStatusText(t('VM 시작 이미지 확인 중...'));

        const initialState = disableWarmStart ? null : await loadVmInitialState(VM_BOOT_CONFIG.initialStatePath);
        if (!isMounted) {
          return;
        }

        let useWarmStart = Boolean(initialState);
        if (useWarmStart) {
          setVmStatusText(t('빠른 시작 스냅샷 로딩 중...'));
        }

        const baseOptions: V86Options = {
          wasm_path: VM_BOOT_CONFIG.wasmPath,
          wasm_fallback_path: VM_BOOT_CONFIG.wasmFallbackPath,
          memory_size: 256 * 1024 * 1024,
          vga_memory_size: 8 * 1024 * 1024,
          bios: { url: VM_BOOT_CONFIG.biosPath },
          vga_bios: { url: VM_BOOT_CONFIG.vgaBiosPath },
          filesystem: {
            basefs: {
              url: VM_BOOT_CONFIG.fsJsonPath,
            },
            baseurl: VM_BOOT_CONFIG.fsBasePath,
          },
          bzimage_initrd_from_filesystem: true,
          cmdline:
            'rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose console=ttyS0 init=/sbin/init quiet loglevel=3',
          uart1: true,
          uart2: true,
          disable_keyboard: true,
          disable_mouse: true,
          autostart: true,
        };

        let emulator: V86;
        if (useWarmStart) {
          try {
            emulator = new V86Ctor({
              ...baseOptions,
              initial_state: initialState ?? undefined,
            });
          } catch {
            useWarmStart = false;
            setVmStatusText(t('빠른 시작 스냅샷 복원 실패, 일반 부팅으로 전환'));
            emulator = new V86Ctor(baseOptions);
          }
        } else {
          emulator = new V86Ctor(baseOptions);
        }

        lastEmulatorOptionsRef.current = {
          ...baseOptions,
          ...(useWarmStart ? { initial_state: initialState ?? undefined } : {}),
        };
        vmWarmBannerPendingRef.current = useWarmStart;

        emulatorRef.current = emulator;

        loadedListener = () => {
          setVmStatusText(useWarmStart ? t('빠른 시작 스냅샷 복원 완료') : t('커널 및 루트FS 로딩 완료'));
        };

        stopListener = () => {
          setVmStatus('stopped');
          setVmStatusText(t('VM이 중지되었습니다'));
        };

        serialListener = (value) => {
          if (typeof value !== 'number') {
            return;
          }
          writeByte(value);
        };

        serialProbeListener = (value) => {
          if (typeof value !== 'number') {
            return;
          }
          writeProbeByte(value);
        };

        emulator.add_listener('emulator-loaded', loadedListener);
        emulator.add_listener('emulator-stopped', stopListener);
        emulator.add_listener('serial0-output-byte', serialListener);
        emulator.add_listener('serial1-output-byte', serialProbeListener);

        setVmStatus('booting');
        setVmStatusText(t('VM 부팅 중...'));

        const probeBootstrapDelayMs = useWarmStart ? 700 : 2600;
        window.setTimeout(() => {
          if (!emulatorRef.current) {
            return;
          }
          emulatorRef.current.serial0_send('\n');
          if (useWarmStart) {
            window.setTimeout(() => {
              if (!emulatorRef.current) {
                return;
              }
              emulatorRef.current.serial0_send(`${BANNER_TRIGGER_COMMAND}\n`);
              sendInternalCommand(TERMINAL_GEOMETRY_SYNC_COMMAND);
              if (autoProbeRef.current) {
                sendInternalCommand(PROBE_LOOP_START_COMMAND);
              }
              sendInternalCommand(PROBE_TRIGGER_COMMAND);
              vmInternalBridgeReadyRef.current = true;
              vmWarmBannerPendingRef.current = false;
            }, 180);
          }
        }, probeBootstrapDelayMs);
      } catch {
        setVmStatus('error');
        setVmStatusText(t('v86 초기화 실패 (bios/wasm 경로 확인 필요)'));
      }
    })();

    return () => {
      isMounted = false;

      inputLineBufferRef.current = '';
      inputEscapeSequenceRef.current = false;
      outputEscapeSequenceRef.current = false;
      probeLineBufferRef.current = '';
      shortcutTelemetryStateRef.current = createTmuxShortcutTelemetryState();
      if (searchProbeTimerRef.current !== null) {
        window.clearTimeout(searchProbeTimerRef.current);
        searchProbeTimerRef.current = null;
      }

      dataDisposable.dispose();

      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }

      const emulator = emulatorRef.current;
      emulatorRef.current = null;

      if (emulator) {
        if (loadedListener) {
          emulator.remove_listener('emulator-loaded', loadedListener);
        }
        if (stopListener) {
          emulator.remove_listener('emulator-stopped', stopListener);
        }
        if (serialListener) {
          emulator.remove_listener('serial0-output-byte', serialListener);
        }
        if (serialProbeListener) {
          emulator.remove_listener('serial1-output-byte', serialProbeListener);
        }

        void Promise.resolve(emulator.stop()).catch(() => undefined);
        void Promise.resolve(emulator.destroy()).catch(() => undefined);
      }
    };
  }, [
    captureInteractiveCommandInput,
    clearScheduledAchievementAnnouncements,
    contentState.status,
    disableWarmStart,
    pushDebugLine,
    registerCommand,
    requestSearchProbe,
    sendInternalCommand,
    t,
    updateMetricByProbe,
    vmEpoch,
  ]);

  useEffect(() => {
    if (!content || !selectedMission || !selectedMissionStatus) {
      return;
    }

    const missionSlug = selectedMission.slug;

    if (selectedMissionStatus.status !== 'complete') {
      return;
    }

    if (celebratedMissionSetRef.current.has(missionSlug)) {
      return;
    }

    if (completedMissionSlugs.includes(missionSlug)) {
      celebratedMissionSetRef.current.add(missionSlug);
      return;
    }

    celebratedMissionSetRef.current.add(missionSlug);

    completeSelectedMission('auto');
  }, [
    completeSelectedMission,
    completedMissionSlugs,
    content,
    selectedMission,
    selectedMissionStatus,
  ]);

  const handleManualMissionComplete = useCallback(() => {
    if (!selectedMission) {
      return;
    }

    const missionSlug = selectedMission.slug;
    if (completedMissionSlugs.includes(missionSlug)) {
      return;
    }

    celebratedMissionSetRef.current.add(missionSlug);
    completeSelectedMission('manual');
  }, [completeSelectedMission, completedMissionSlugs, selectedMission]);

  const missionHintPreview = selectedMission?.hints.slice(0, 2) ?? [];
  const hiddenMissionHintCount = selectedMission
    ? Math.max(selectedMission.hints.length - missionHintPreview.length, 0)
    : 0;
  const bannerLessonTerms = useMemo(() => {
    if (!selectedLesson) {
      return [];
    }
    return resolveLessonTerms(selectedLesson, lessonMissions, content?.termGlossary ?? null);
  }, [selectedLesson, lessonMissions, content]);

  const selectedMissionCommands = useMemo(() => buildMissionCommandSuggestions(selectedMission), [selectedMission]);
  const selectedMissionPreconditions = useMemo(
    () => buildMissionPreconditionItems(t, selectedMission, vmSnapshot),
    [selectedMission, t, vmSnapshot],
  );

  if (contentState.status === 'loading') {
    return (
      <PagePlaceholder
        eyebrow="Practice"
        title={t('Browser VM 초기화 중')}
        description={t('커리큘럼과 VM 리소스를 로딩하고 있습니다.')}
      />
    );
  }

  if (contentState.status === 'error' || !content) {
    return (
      <PagePlaceholder
        eyebrow="Practice"
        title={t('VM Practice 로드 실패')}
        description={t('커리큘럼 데이터를 읽지 못했습니다.')}
      >
        <div className="inline-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('새로고침')}
          </button>
        </div>
      </PagePlaceholder>
    );
  }

  return (
    <PagePlaceholder
      eyebrow="Practice"
      title={t('tmux 실습')}
      description=""
    >
      <p className="vm-mobile-hint">
        {t('원활한 실습을 위해 데스크톱 브라우저 사용을 권장합니다.')}
      </p>
      <div className="vm-poc-panel">
        <p className="sr-only" role="status" aria-live="polite">
          {achievementLiveMessage}
        </p>

        <div className="vm-mobile-switch" role="tablist" aria-label={t('실습 화면 전환')}>
          <button
            type="button"
            className={`secondary-btn ${mobileWorkbenchView === 'mission' ? 'is-active' : ''}`}
            onClick={() => setMobileWorkbenchView('mission')}
          >
            {t('미션')}
          </button>
          <button
            type="button"
            className={`secondary-btn ${mobileWorkbenchView === 'terminal' ? 'is-active' : ''}`}
            onClick={() => setMobileWorkbenchView('terminal')}
          >
            {t('터미널')}
          </button>
        </div>

        {selectedLesson ? (
          <section className="vm-lesson-banner">
            <div className="vm-lesson-banner-header">
              <span className="vm-lesson-banner-path">
                {t(selectedLessonTrack?.title ?? selectedLesson.trackSlug)} ·{' '}
                {t(selectedLessonChapter?.title ?? selectedLesson.chapterSlug)}
              </span>
              <h2 className="vm-lesson-banner-title">{t(selectedLesson.title)}</h2>
              <span className="vm-lesson-banner-meta">
                {selectedLessonIsGuide
                  ? t('{{minutes}}분 · 목표 {{objectiveCount}} · 실습형 레슨', {
                      minutes: selectedLesson.estimatedMinutes,
                      objectiveCount: selectedLesson.objectives.length,
                    })
                  : t('{{minutes}}분 · 목표 {{objectiveCount}} · 미션 {{missionCount}}', {
                      minutes: selectedLesson.estimatedMinutes,
                      objectiveCount: selectedLesson.objectives.length,
                      missionCount: lessonMissions.length,
                    })}
              </span>
            </div>
            <div className="vm-lesson-banner-body">
              <div className="vm-lesson-banner-col">
                {selectedLesson.overview ? (
                  <p>
                    {renderTextWithShortcutTooltip(t(selectedLesson.overview), 'banner-overview')}
                  </p>
                ) : null}
                {selectedLesson.goal ? (
                  <p className="vm-lesson-banner-goal">
                    <strong>{t('목표:')}</strong>{' '}
                    {renderTextWithShortcutTooltip(t(selectedLesson.goal), 'banner-goal')}
                  </p>
                ) : null}
              </div>
              <div className="vm-lesson-banner-col">
                <ul className="vm-lesson-banner-objectives">
                  {selectedLesson.objectives.map((objective, index) => (
                    <li key={`banner-obj-${index}`}>
                      {renderTextWithShortcutTooltip(t(objective), `banner-obj-${index}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="vm-lesson-banner-footer">
              {selectedLesson.successCriteria && selectedLesson.successCriteria.length > 0 ? (
                <span className="vm-lesson-banner-tag">
                  <strong>{t('완료:')}</strong>{' '}
                  {selectedLesson.successCriteria.map((item, index) => (
                    <span key={`banner-sc-${index}`}>
                      {index > 0 ? ' · ' : ''}
                      {renderTextWithShortcutTooltip(t(item), `banner-sc-${index}`)}
                    </span>
                  ))}
                </span>
              ) : null}
              {selectedLesson.failureStates && selectedLesson.failureStates.length > 0 ? (
                <span className="vm-lesson-banner-tag is-warn">
                  <strong>{t('부족:')}</strong>{' '}
                  {selectedLesson.failureStates.map((item, index) => (
                    <span key={`banner-fs-${index}`}>
                      {index > 0 ? ' · ' : ''}
                      {renderTextWithShortcutTooltip(t(item), `banner-fs-${index}`)}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
            {bannerLessonTerms.length > 0 ? (
              <div className="vm-lesson-banner-terms-row">
                <span className="vm-lesson-banner-terms-label">{t('용어사전')}</span>
                {bannerLessonTerms.map((term) => (
                  <span key={term.id} className="vm-lesson-banner-term">
                    <strong>{t(term.title)}</strong> {t(term.description)}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={`vm-workbench vm-workbench-view-${mobileWorkbenchView}`}>
          <aside className="vm-study-panel">
            {selectedLessonIsGuide && selectedLesson ? (
              <article className="vm-mission-card vm-guide-card">
                <p className="vm-mission-priority-eyebrow">Guide</p>
                <h2>{t('실습 가이드')}</h2>
                <p className="muted">{t('이 레슨은 미션 판정 없이 체크리스트 기반으로 진행합니다.')}</p>

                <section className="vm-learning-nav-card">
                  <div className="vm-learning-nav-group">
                    <p className="vm-learning-nav-label">{t('레슨 이동')}</p>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={!previousLesson}
                        onClick={selectPreviousLessonForAction}
                      >
                        {t('이전 레슨')}
                      </button>
                      <button type="button" className="secondary-btn" disabled={!nextLesson} onClick={selectNextLessonForAction}>
                        {t('다음 레슨')}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="vm-mission-command-block">
                  <h3>{t('확인 명령')}</h3>
                  {selectedGuideCommands.length > 0 ? (
                    <div className="vm-mission-command-list">
                      {selectedGuideCommands.map((command) => (
                        <button
                          key={command}
                          type="button"
                          className="vm-mission-command-chip"
                          onClick={() => {
                            setCommandInput(command);
                            setMobileWorkbenchView('terminal');
                          }}
                        >
                          <code>{command}</code>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">{t('등록된 명령이 없습니다.')}</p>
                  )}
                </section>

                <div className="vm-guide-grid">
                  <section className="vm-guide-block">
                    <h3>{t('증상')}</h3>
                    {selectedGuideSymptoms.length === 0 ? (
                      <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                    ) : (
                      <ul className="link-list">
                        {selectedGuideSymptoms.map((item, index) => (
                          <li key={`vm-guide-symptom-${index}`}>{renderTextWithShortcutTooltip(t(item), `vm-guide-symptom-${index}`)}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="vm-guide-block">
                    <h3>{t('확인 항목')}</h3>
                    {selectedGuideChecks.length === 0 ? (
                      <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                    ) : (
                      <ul className="link-list">
                        {selectedGuideChecks.map((item, index) => (
                          <li key={`vm-guide-check-${index}`}>{renderTextWithShortcutTooltip(t(item), `vm-guide-check-${index}`)}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="vm-guide-block">
                    <h3>{t('우회책')}</h3>
                    {selectedGuideWorkarounds.length === 0 ? (
                      <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                    ) : (
                      <ul className="link-list">
                        {selectedGuideWorkarounds.map((item, index) => (
                          <li key={`vm-guide-workaround-${index}`}>
                            {renderTextWithShortcutTooltip(t(item), `vm-guide-workaround-${index}`)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="vm-guide-block">
                    <h3>{t('체크리스트')}</h3>
                    {selectedGuideChecklist.length === 0 ? (
                      <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                    ) : (
                      <ul className="link-list">
                        {selectedGuideChecklist.map((item, index) => (
                          <li key={`vm-guide-checklist-${index}`}>
                            {renderTextWithShortcutTooltip(t(item), `vm-guide-checklist-${index}`)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </article>
            ) : null}

            {!selectedLessonIsGuide && selectedMission ? (
              <article className="vm-mission-card vm-mission-priority-card">
                <p className="vm-mission-priority-eyebrow">Priority 1</p>
                <h2>
                  {t('현재 미션')}
                  {selectedMissionOrder ? ` ${selectedMissionOrder}/${lessonMissions.length}` : ''}
                </h2>
                <p className="muted">
                  {t(selectedMission.title)} · {t('난이도')} {getDifficultyLabel(t, selectedMission.difficulty)}
                </p>
                {missionCompletionMessage ? (
                  <p className="vm-mission-complete-flash" role="status" aria-live="polite">
                    {missionCompletionMessage}
                  </p>
                ) : null}

                <section className="vm-learning-nav-card">
                  <div className="vm-learning-nav-group">
                    <p className="vm-learning-nav-label">{t('미션 이동')}</p>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={!previousMissionInLesson}
                        onClick={() => {
                          if (previousMissionInLesson) {
                            selectMissionForAction(previousMissionInLesson.slug);
                          }
                        }}
                      >
                        {t('이전 미션')}
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={!nextMissionInLesson}
                        onClick={() => {
                          if (nextMissionInLesson) {
                            selectMissionForAction(nextMissionInLesson.slug);
                          }
                        }}
                      >
                        {t('다음 미션')}
                      </button>
                    </div>
                  </div>
                  <div className="vm-learning-nav-group">
                    <p className="vm-learning-nav-label">{t('레슨 이동')}</p>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={!previousLesson}
                        onClick={selectPreviousLessonForAction}
                      >
                        {t('이전 레슨')}
                      </button>
                      <button type="button" className="secondary-btn" disabled={!nextLesson} onClick={selectNextLessonForAction}>
                        {t('다음 레슨')}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="vm-mission-command-block">
                  <h3>{t('이 미션에서 입력할 명령')}</h3>
                  {selectedMissionCommands.length > 0 ? (
                    <div className="vm-mission-command-list">
                      {selectedMissionCommands.map((command) => (
                        <button
                          key={command}
                          type="button"
                          className="vm-mission-command-chip"
                          onClick={() => {
                            setCommandInput(command);
                            setMobileWorkbenchView('terminal');
                          }}
                        >
                          <code>{command}</code>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">{t('추천 명령을 찾지 못했습니다. 아래 힌트를 기준으로 직접 입력해 주세요.')}</p>
                  )}
                  <p className="muted">{t('명령을 클릭하면 입력창에 채워지고 터미널 탭으로 전환됩니다.')}</p>
                </section>

                <section className="vm-mission-precondition-block">
                  <h3>{t('실행 전 프리컨디션')}</h3>
                  <ul className="vm-precondition-list">
                    {selectedMissionPreconditions.map((item) => (
                      <li key={item.key} className={`vm-precondition-row ${item.satisfied ? 'is-satisfied' : 'is-pending'}`}>
                        <span>{item.label}</span>
                        <small>{item.current}</small>
                      </li>
                    ))}
                  </ul>
                </section>

                <ul className="link-list">
                  {missionHintPreview.map((hint, index) => (
                        <li key={hint}>{renderHintTextWithTooltips(t(hint), `hint-preview-${index}`, t)}</li>
                  ))}
                </ul>
                {hiddenMissionHintCount > 0 ? (
                  <details className="vm-mission-hints-more">
                    <summary>{t('힌트 {{count}}개 더 보기', { count: hiddenMissionHintCount })}</summary>
                    <ul className="link-list">
                      {selectedMission.hints.slice(missionHintPreview.length).map((hint, index) => (
                        <li key={hint}>{renderHintTextWithTooltips(t(hint), `hint-more-${index}`, t)}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {selectedMissionStatus ? (
                  <div className="vm-mission-status">
                    <p>
                      <strong>{t('판정:')}</strong> {selectedMissionStatus.status} · {t(selectedMissionStatus.reason)}
                    </p>
                    {selectedMissionStatus.status === 'manual' ? (
                      <button type="button" className="secondary-btn" onClick={handleManualMissionComplete}>
                        {t('수동 완료 처리')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {selectedMission && selectedMissionCompleted ? (
                  <section className="vm-next-action-card" aria-live="polite">
                    <p className="vm-next-action-eyebrow">{t('추천 다음 단계')}</p>
                    {nextIncompleteMission ? (
                      <>
                        <h2>{t('다음 미션 진행')}</h2>
                        <p>{t('방금 완료한 흐름을 이어서 바로 진행할 수 있습니다.')}</p>
                        <button
                          type="button"
                          className="primary-btn vm-next-action-btn"
                          onClick={() => selectMissionForAction(nextIncompleteMission.slug)}
                        >
                          {t('다음 미션')}
                        </button>
                        <p className="vm-next-action-meta">{t('다음: {{title}}', { title: nextIncompleteMission.title })}</p>
                      </>
                    ) : null}
                    {!nextIncompleteMission && lessonCompleted && nextLesson ? (
                      <>
                        <h2>{t('다음 레슨 진행')}</h2>
                        <p>{t('현재 레슨을 모두 완료했습니다. 바로 다음 레슨으로 이동하세요.')}</p>
                        <button type="button" className="primary-btn vm-next-action-btn" onClick={selectNextLessonForAction}>
                          {t('다음 레슨')}
                        </button>
                        <p className="vm-next-action-meta">{t('다음: {{title}}', { title: nextLesson.title })}</p>
                      </>
                    ) : null}
                    {!nextIncompleteMission && lessonCompleted && !nextLesson ? (
                      <>
                        <h2>{t('학습 경로 완료')}</h2>
                        <p>{t('모든 레슨을 마쳤습니다. 완료 현황에서 진행률과 업적을 확인하세요.')}</p>
                        <Link className="primary-btn vm-next-action-btn" to="/progress">
                          {t('완료 현황')}
                        </Link>
                      </>
                    ) : null}
                  </section>
                ) : null}
              </article>
            ) : null}

            <section className="vm-achievement-feed-card" aria-label={t('이번 세션 업적')}>
              <div className="vm-achievement-feed-header">
                <h2>{t('이번 세션 업적')}</h2>
                {achievementUnreadCount > 0 ? (
                  <button type="button" className="secondary-btn" onClick={markAchievementFeedAsRead}>
                    {t('새 업적 {{count}}', { count: achievementUnreadCount })}
                  </button>
                ) : null}
              </div>
              {achievementFeed.length === 0 ? (
                <p className="muted">{t('업적이 해금되면 여기에 기록됩니다.')}</p>
              ) : (
                <ul className="vm-achievement-feed-list">
                  {achievementFeed.map((entry, index) => (
                    <li
                      key={entry.id}
                      className={`vm-achievement-feed-item ${index < achievementUnreadCount ? 'is-unread' : ''}`}
                    >
                      <div className="vm-achievement-feed-item-head">
                        <strong>{t(entry.title)}</strong>
                        <small>{formatUnlockedTime(entry.unlockedAt)}</small>
                      </div>
                      <p>{t(entry.description)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="inline-actions">
                <Link className="secondary-btn" to="/progress">
                  {t('Progress에서 업적 보기')}
                </Link>
              </div>
            </section>

            <section className="vm-mission-list-card">
              <div className="vm-mission-list-header">
                <h2>
                  {selectedLessonIsGuide
                    ? t('실습 체크리스트')
                    : t('미션 {{completed}}/{{total}}', { completed: lessonCompletedMissionCount, total: lessonMissions.length })}
                </h2>
              </div>
              {selectedLessonIsGuide ? (
                <p className="vm-mission-list-status">{t('이 레슨은 자동 판정 없이 체크리스트 기준으로 진행합니다.')}</p>
              ) : selectedMissionStatus ? (
                <p className="vm-mission-list-status">
                  {t('판정:')} {selectedMissionStatus.status} · {t(selectedMissionStatus.reason)}
                </p>
              ) : null}
              {selectedLessonIsGuide ? (
                <div className="vm-mission-list-empty">
                  {selectedGuideChecklist.length === 0 ? (
                    <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                  ) : (
                    <ul className="link-list">
                      {selectedGuideChecklist.map((item, index) => (
                        <li key={`guide-list-check-${index}`}>
                          {renderTextWithShortcutTooltip(t(item), `guide-list-check-${index}`)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="vm-mission-list">
                  {lessonMissions.map((mission, index) => {
                    const missionStatus = missionStatusMap.get(mission.slug);
                    const isSelected = mission.slug === selectedMissionSlug;
                    const isCompleted = completedMissionSlugs.includes(mission.slug);

                    let badgeClass = 'is-pending';
                    let badgeLabel = t('대기');

                    if (isCompleted) {
                      badgeClass = 'is-complete';
                      badgeLabel = t('완료');
                    } else if (missionStatus?.status === 'complete') {
                      badgeClass = 'is-live-complete';
                      badgeLabel = t('실시간 통과');
                    } else if (missionStatus?.status === 'manual') {
                      badgeClass = 'is-manual';
                      badgeLabel = t('수동');
                    }

                    return (
                      <button
                        key={mission.id}
                        type="button"
                        className={`vm-mission-row ${isSelected ? 'is-active' : ''}`}
                        onClick={() => selectMissionForAction(mission.slug)}
                      >
                        <span className="vm-mission-row-main">
                          <strong>
                            {index + 1}. {t(mission.title)}
                          </strong>
                          <small>{t('난이도')} {getDifficultyLabel(t, mission.difficulty)}</small>
                        </span>
                        <span className={`vm-mission-row-badge ${badgeClass}`}>{badgeLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="vm-curriculum-panel vm-curriculum-row-layout">
              <div className="inline-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => selectLessonForAction(LEARNING_PATH_ENTRY_LESSON, { resetFilter: true })}
                >
                  {t('통합 학습 경로 처음으로')}
                </button>
              </div>
              <div className="vm-lesson-filter" role="tablist" aria-label={t('레슨 필터')}>
                {LESSON_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`secondary-btn vm-lesson-filter-btn ${lessonFilter === option.value ? 'is-active' : ''}`}
                    onClick={() => setLessonFilter(option.value)}
                  >
                    {t(option.label)}
                  </button>
                ))}
              </div>
              <section className="vm-lesson-catalog" aria-label={t('레슨 목록')}>
                {filteredLessonRows.length === 0 ? (
                  <p className="muted">{t('선택한 필터에 해당하는 레슨이 없습니다.')}</p>
                ) : (
                  filteredLessonRows.map((row) => {
                    const isActive = row.lesson.slug === selectedLessonSlug;
                    const trackTitle = trackTitleMap.get(row.lesson.trackSlug) ?? row.lesson.trackSlug;
                    const chapterTitle = chapterTitleMap.get(row.lesson.chapterSlug) ?? row.lesson.chapterSlug;

                    return (
                      <button
                        key={row.lesson.id}
                        type="button"
                        className={`vm-lesson-row ${isActive ? 'is-active' : ''}`}
                        onClick={() => selectLessonForAction(row.lesson.slug)}
                        aria-pressed={isActive}
                      >
                        <span className="vm-lesson-row-main">
                          <strong>{t(row.lesson.title)}</strong>
                          <small>
                            {t(trackTitle)} · {t(chapterTitle)}
                          </small>
                        </span>
                        <span className="vm-lesson-row-meta">
                          <small>
                            {row.completedMissionCount}/{row.totalMissionCount}
                          </small>
                          <span className={`vm-lesson-row-status ${getLessonStatusClass(row.status)}`}>
                            {getLessonStatusLabel(t, row.status)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </section>
              <div className="vm-lesson-progress">
                {selectedLessonIsGuide ? (
                  <p>
                    <strong>{t('Lesson 유형:')}</strong> {t('실습형 (미션 판정 없음)')}
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>{t('Lesson 진행:')}</strong> {lessonCompletedMissionCount}/{lessonMissions.length}
                    </p>
                    <p className="muted">{t('manual 판정 미션: {{count}}', { count: manualMissionCandidates.length })}</p>
                  </>
                )}
              </div>
              <div className={`vm-runtime-badge ${getMetricBadgeClass(vmStatus)}`}>
                <span>{t('VM 상태: {{vmStatus}}', { vmStatus })}</span>
                <span>{vmStatusText}</span>
              </div>
            </section>
          </aside>

          <section className="vm-lab-panel">
            <section className="vm-poc-controls">
              <div className="inline-actions">
                <Link className="secondary-btn" to="/learn">
                  {t('커리큘럼으로 이동')}
                </Link>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setVmEpoch((value) => value + 1);
                  }}
                >
                  {t('VM 재시작')}
                </button>
                <label className="vm-poc-check" htmlFor="auto-probe-toggle">
                  <input
                    id="auto-probe-toggle"
                    type="checkbox"
                    checked={autoProbe}
                    onChange={(event) => setAutoProbe(event.target.checked)}
                  />
                  Auto probe
                </label>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    sendInternalCommand(PROBE_TRIGGER_COMMAND);
                  }}
                >
                  {t('Probe 지금 실행')}
                </button>
              </div>

              <form
                className="vm-poc-command-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendCommand(commandInput);
                }}
              >
                <input
                  className="vm-poc-command-input"
                  value={commandInput}
                  onChange={(event) => setCommandInput(event.target.value)}
                  placeholder="tmux new-session -d -s lesson"
                  aria-label="VM shell command"
                />
                <button type="submit" className="primary-btn" disabled={vmStatus === 'error'}>
                  {t('명령 실행')}
                </button>
              </form>

              <details className="vm-poc-quick-wrap">
                <summary>{t('자주 쓰는 명령 빠르게 실행')}</summary>
                <div className="vm-poc-quick">
                  {QUICK_COMMANDS.map((item) => (
                    <button key={item.label} type="button" className="secondary-btn" onClick={() => sendCommand(item.command)}>
                      {t(item.label)}
                    </button>
                  ))}
                </div>
              </details>

              <p className="vm-poc-status">
                metrics · sessions {metrics.sessionCount ?? '-'} / sessionName {metrics.sessionName ?? '-'} / windows{' '}
                {metrics.windowCount ?? '-'} / panes {metrics.paneCount ?? '-'} / activeWindow{' '}
                {metrics.activeWindowIndex ?? '-'} / zoom{' '}
                {metrics.windowZoomed === null ? '-' : metrics.windowZoomed ? 'yes' : 'no'} / sync{' '}
                {metrics.paneSynchronized === null ? '-' : metrics.paneSynchronized ? 'yes' : 'no'} / layout{' '}
                {formatLayout(metrics.windowLayout)} / mode {metrics.modeIs ?? '-'} / search{' '}
                {metrics.searchExecuted === null ? '-' : metrics.searchExecuted ? 'yes' : 'no'} / match{' '}
                {metrics.searchMatchFound === null ? '-' : metrics.searchMatchFound ? 'yes' : 'no'}
              </p>
            </section>

            <section className="vm-terminal-shell" aria-label="VM terminal">
              <div className="vm-terminal-host" ref={terminalHostRef} />
            </section>

            <details className="vm-poc-debug">
              <summary>{t('브리지 디버그')}</summary>
              <div className="vm-debug-grid">
                <article>
                  <h3>Recent Action History</h3>
                  <pre className="vm-poc-debug-text">{actionHistory.slice(-20).join('\n') || '(empty)'}</pre>
                </article>
                <article>
                  <h3>Recent Command History</h3>
                  <pre className="vm-poc-debug-text">{commandHistory.slice(-20).join('\n') || '(empty)'}</pre>
                </article>
                <article>
                  <h3>Recent VM Output Lines</h3>
                  <pre className="vm-poc-debug-text">{debugLines.slice(-50).join('\n') || '(empty)'}</pre>
                </article>
              </div>
            </details>
          </section>
        </section>
      </div>
    </PagePlaceholder>
  );
}
