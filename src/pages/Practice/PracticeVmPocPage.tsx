import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import type V86 from 'v86';
import type { V86Options } from 'v86';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import {
  advanceCompletionFeedback,
  enqueueCompletionFeedback,
  type CompletionFeedbackItem,
  type CompletionFeedbackQueueState,
} from '../../features/progress/completionFeedbackQueue';
import { getAchievementDefinition } from '../../features/progress';
import { useProgressStore } from '../../features/progress/progressStore';
import { buildAbsoluteAchievementShareUrl, buildAchievementChallengeShareText, buildTwitterIntentUrl } from '../../features/sharing';
import {
  evaluateMissionWithVmSnapshot,
  parseProbeMetricFromLine,
  parseTmuxActionsFromCommand,
  stripAnsi,
  type VmBridgeSnapshot,
  type VmProbeMetric,
} from '../../features/vm/missionBridge';
import {
  buildLessonProgressRows,
  filterLessonProgressRows,
  resolveDefaultMissionSlugForLesson,
  type LessonCompletionStatus,
  type LessonFilter,
} from './lessonProgress';

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

type CelebrationState = CompletionFeedbackItem;
type CelebrationQueueState = CompletionFeedbackQueueState;

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
const PROBE_TRIGGER_COMMAND = '/usr/bin/tmux-tuto-probe >/dev/ttyS1 2>/dev/null';
const BANNER_TRIGGER_COMMAND = '/usr/bin/tmux-tuto-banner';
const PROBE_LOOP_START_COMMAND =
  'if [ -z "${TMUXWEB_PROBE_LOOP_PID:-}" ] || ! kill -0 "${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null; then (while true; do /usr/bin/tmux-tuto-probe >/dev/ttyS1 2>/dev/null; sleep 0.5; done) </dev/null >/dev/null 2>&1 & TMUXWEB_PROBE_LOOP_PID=$!; export TMUXWEB_PROBE_LOOP_PID; fi';
const PROBE_LOOP_STOP_COMMAND =
  'if [ -n "${TMUXWEB_PROBE_LOOP_PID:-}" ]; then kill "${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null || true; unset TMUXWEB_PROBE_LOOP_PID; fi';
const TERMINAL_GEOMETRY_SYNC_COMMAND = `stty cols ${DEFAULT_TERMINAL_COLS} rows ${DEFAULT_TERMINAL_ROWS} >/dev/null 2>&1; tmux resize-window -x ${DEFAULT_TERMINAL_COLS} -y ${DEFAULT_TERMINAL_ROWS} >/dev/null 2>&1 || true`;

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

const BEGINNER_ENTRY_LESSON = 'hello-tmux';
const ADVANCED_ENTRY_LESSON = 'copy-search';
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

function getDifficultyLabel(difficulty: AppMission['difficulty']) {
  switch (difficulty) {
    case 'beginner':
      return '입문';
    case 'daily':
      return '실전';
    case 'advanced':
      return '고급';
    case 'scenario':
      return '시나리오';
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
  'sim.command.prompt': 'tmux command-prompt -p "cmd"',
  'sim.choose.tree': 'tmux choose-tree -Z',
};

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

function getRulePreconditionLabel(rule: AppMission['passRules'][number]) {
  switch (rule.kind) {
    case 'sessionCount':
      return `세션 수가 ${rule.operator} ${String(rule.value)} 이어야 함`;
    case 'windowCount':
      return `윈도우 수가 ${rule.operator} ${String(rule.value)} 이어야 함`;
    case 'paneCount':
      return `패인 수가 ${rule.operator} ${String(rule.value)} 이어야 함`;
    case 'activeWindowIndex':
      return `활성 윈도우 인덱스가 ${rule.operator} ${String(rule.value)} 이어야 함`;
    case 'modeIs':
      return rule.value === 'COPY_MODE'
        ? 'Copy Mode에 진입해야 함'
        : `mode 값이 ${rule.operator} ${String(rule.value)} 이어야 함`;
    case 'searchExecuted':
      return 'Copy Mode에서 검색을 실행해야 함';
    case 'searchMatchFound':
      return rule.value === true ? '검색 결과가 있어야 함' : '검색 결과가 없어야 함';
    case 'shellHistoryText':
      return `쉘 히스토리에 ${JSON.stringify(rule.value)} 실행 기록이 있어야 함`;
    case 'actionHistoryText':
      return `tmux 액션 로그에 ${JSON.stringify(rule.value)} 기록이 있어야 함`;
    default:
      return `${rule.kind} ${rule.operator} ${JSON.stringify(rule.value)} 조건`;
  }
}

function getRuleCurrentStateText(rule: AppMission['passRules'][number], snapshot: VmBridgeSnapshot) {
  switch (rule.kind) {
    case 'sessionCount':
      return `현재 session: ${snapshot.sessionCount ?? '-'}`;
    case 'windowCount':
      return `현재 window: ${snapshot.windowCount ?? '-'}`;
    case 'paneCount':
      return `현재 pane: ${snapshot.paneCount ?? '-'}`;
    case 'activeWindowIndex':
      return `현재 activeWindow: ${snapshot.activeWindowIndex ?? '-'}`;
    case 'modeIs':
      return `현재 mode: ${snapshot.modeIs ?? '-'}`;
    case 'searchExecuted':
      return `현재 searchExecuted: ${snapshot.searchExecuted === null ? '-' : snapshot.searchExecuted ? 'yes' : 'no'}`;
    case 'searchMatchFound':
      return `현재 searchMatchFound: ${
        snapshot.searchMatchFound === null ? '-' : snapshot.searchMatchFound ? 'yes' : 'no'
      }`;
    case 'shellHistoryText': {
      const expected = typeof rule.value === 'string' ? rule.value : null;
      if (!expected) {
        return `최근 명령 ${snapshot.commandHistory.length}개`;
      }
      const found = snapshot.commandHistory.some((command) => command.includes(expected));
      return found ? `최근 명령에서 "${expected}" 확인됨` : `최근 명령에서 "${expected}" 미확인`;
    }
    case 'actionHistoryText': {
      const expected = typeof rule.value === 'string' ? rule.value : null;
      if (!expected) {
        return `최근 액션 ${snapshot.actionHistory.length}개`;
      }
      const found = snapshot.actionHistory.some((action) => action.includes(expected));
      return found ? `최근 액션에서 "${expected}" 확인됨` : `최근 액션에서 "${expected}" 미확인`;
    }
    default:
      return '현재 상태 측정값 없음';
  }
}

function getInitialScenarioLabel(initialScenario: string) {
  switch (initialScenario) {
    case 'single-pane':
      return '초기 시나리오: 단일 pane에서 시작';
    case 'log-buffer':
      return '초기 시나리오: 로그 버퍼가 준비된 pane에서 시작';
    default:
      return `초기 시나리오: ${initialScenario}`;
  }
}

function buildMissionPreconditionItems(mission: AppMission | null, snapshot: VmBridgeSnapshot): MissionPreconditionItem[] {
  if (!mission) {
    return [];
  }

  const ruleItems = mission.passRules.map<MissionPreconditionItem>((rule, index) => {
    const actual = getRuleMetricValue(snapshot, rule.kind);
    const satisfied = actual !== null && actual !== undefined && evaluateRuleOperator(actual, rule.operator, rule.value);

    return {
      key: `${rule.kind}-${index}`,
      label: getRulePreconditionLabel(rule),
      current: getRuleCurrentStateText(rule, snapshot),
      satisfied,
    };
  });

  return [
    {
      key: 'initial-scenario',
      label: getInitialScenarioLabel(mission.initialScenario),
      current: '미션 진입 시 자동 적용',
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

function formatSessionDateTime(iso: string | null) {
  if (!iso) {
    return '-';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getLessonStatusLabel(status: LessonCompletionStatus) {
  switch (status) {
    case 'completed':
      return '완료';
    case 'in-progress':
      return '진행중';
    case 'not-started':
    default:
      return '미시작';
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

function getCelebrationKindLabel(kind: CelebrationState['kind']) {
  switch (kind) {
    case 'mission':
      return 'Mission Complete';
    case 'lesson':
      return 'Lesson Complete';
    case 'achievement':
      return 'Achievement';
    default:
      return 'Update';
  }
}

export function PracticeVmPocPage() {
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
  const [vmStatusText, setVmStatusText] = useState('대기 중');
  const [commandInput, setCommandInput] = useState('tmux list-sessions');
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [actionHistory, setActionHistory] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<VmMetricState>(createInitialMetrics());
  const [celebrationState, setCelebrationState] = useState<CelebrationQueueState>({
    active: null,
    queue: [],
  });
  const [autoProbe, setAutoProbe] = useState(true);
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>('all');
  const [mobileWorkbenchView, setMobileWorkbenchView] = useState<'mission' | 'terminal'>('terminal');

  const completedMissionSlugs = useProgressStore((store) => store.completedMissionSlugs);
  const level = useProgressStore((store) => store.level);
  const xp = useProgressStore((store) => store.xp);
  const unlockedAchievements = useProgressStore((store) => store.unlockedAchievements);
  const missionSessions = useProgressStore((store) => store.missionSessions);
  const recordMissionPass = useProgressStore((store) => store.recordMissionPass);
  const recordTmuxActivity = useProgressStore((store) => store.recordTmuxActivity);
  const startMissionSession = useProgressStore((store) => store.startMissionSession);

  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const emulatorRef = useRef<V86 | null>(null);
  const celebrationCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputLineBufferRef = useRef('');
  const inputEscapeSequenceRef = useRef(false);
  const outputEscapeSequenceRef = useRef(false);
  const lineBufferRef = useRef('');
  const probeLineBufferRef = useRef('');
  const autoProbeRef = useRef(autoProbe);
  const celebratedMissionSetRef = useRef(new Set<string>());
  const seenCelebrationKeysRef = useRef(new Set<string>());
  const lastEmulatorOptionsRef = useRef<V86Options | null>(null);
  const vmInternalBridgeReadyRef = useRef(false);
  const vmWarmBannerPendingRef = useRef(false);
  const selectedLessonSlugRef = useRef(selectedLessonSlug);
  const recordTmuxActivityRef = useRef(recordTmuxActivity);

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

  const selectedMissionOrder = useMemo(() => {
    if (!selectedMission) {
      return null;
    }

    const index = lessonMissions.findIndex((mission) => mission.slug === selectedMission.slug);
    return index === -1 ? null : index + 1;
  }, [lessonMissions, selectedMission]);

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
  const selectedMissionSession = useMemo(() => {
    if (!selectedMission) {
      return null;
    }

    for (let index = missionSessions.length - 1; index >= 0; index -= 1) {
      const session = missionSessions[index];
      if (session.missionSlug === selectedMission.slug) {
        return session;
      }
    }

    return null;
  }, [missionSessions, selectedMission]);

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
  }, [completedMissionSlugs, content, nextLesson, startMissionSession]);

  const celebration = celebrationState.active;
  const celebrationQueueCount = celebrationState.queue.length;
  const isAchievementCelebration = celebration?.kind === 'achievement';

  const enqueueCelebration = useCallback((nextCelebration: CelebrationState) => {
    if (seenCelebrationKeysRef.current.has(nextCelebration.key)) {
      return;
    }
    seenCelebrationKeysRef.current.add(nextCelebration.key);

    setCelebrationState((previous) => enqueueCompletionFeedback(previous, nextCelebration));
  }, []);

  const advanceCelebration = useCallback(() => {
    setCelebrationState((previous) => advanceCompletionFeedback(previous));
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
        (definition) => !seenCelebrationKeysRef.current.has(`achievement:${definition.id}`),
      );
      if (unseenDefinitions.length === 0) {
        return;
      }

      if (unseenDefinitions.length === 1) {
        const definition = unseenDefinitions[0];
        enqueueCelebration({
          key: `achievement:${definition.id}`,
          kind: 'achievement',
          message: `업적 달성: ${definition.title}`,
          detail: definition.description,
          achievementId: definition.id,
        });
        return;
      }

      const batchIds = unseenDefinitions.map((definition) => definition.id);
      batchIds.forEach((id) => {
        seenCelebrationKeysRef.current.add(`achievement:${id}`);
      });

      const preview = unseenDefinitions
        .slice(0, 3)
        .map((definition) => definition.title)
        .join(' · ');
      const hiddenCount = unseenDefinitions.length - 3;

      enqueueCelebration({
        key: `achievement-batch:${batchIds.join(',')}`,
        kind: 'achievement',
        message: `업적 ${unseenDefinitions.length}개 달성`,
        detail: hiddenCount > 0 ? `${preview} 외 ${hiddenCount}개` : preview,
      });
    },
    [enqueueCelebration],
  );

  const celebrationAchievement = useMemo(() => {
    if (!celebration?.achievementId) {
      return null;
    }

    return getAchievementDefinition(celebration.achievementId);
  }, [celebration?.achievementId]);

  const celebrationShareHref = useMemo(() => {
    if (!celebrationAchievement) {
      return null;
    }

    const shareUrl = buildAbsoluteAchievementShareUrl(celebrationAchievement.id, {
      level,
      xp,
      date: new Date().toISOString().slice(0, 10),
      badge: celebrationAchievement.id,
    });
    const shareText = buildAchievementChallengeShareText(celebrationAchievement.shareText, celebrationAchievement.id);
    return buildTwitterIntentUrl(shareUrl, shareText);
  }, [celebrationAchievement, level, xp]);

  useEffect(() => {
    autoProbeRef.current = autoProbe;
  }, [autoProbe]);

  useEffect(() => {
    selectedLessonSlugRef.current = selectedLessonSlug;
  }, [selectedLessonSlug]);

  useEffect(() => {
    recordTmuxActivityRef.current = recordTmuxActivity;
  }, [recordTmuxActivity]);

  useEffect(() => {
    if (!celebration) {
      return;
    }

    if (!isAchievementCelebration) {
      celebrationCloseButtonRef.current?.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      advanceCelebration();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [advanceCelebration, celebration, isAchievementCelebration]);

  useEffect(() => {
    if (!celebration || celebration.kind !== 'achievement') {
      return;
    }

    const timer = window.setTimeout(() => {
      advanceCelebration();
    }, 4200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [advanceCelebration, celebration]);

  useEffect(() => {
    if (!celebration || celebration.kind === 'achievement') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [celebration]);

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

    const firstLessonSlug = content.lessons[0]?.slug ?? '';
    const fromParam = content.lessons.some((lesson) => lesson.slug === lessonParam) ? lessonParam : '';
    setSelectedLessonSlug(fromParam || firstLessonSlug);
  }, [content, lessonParam, selectedLessonSlug]);

  useEffect(() => {
    if (!content || filteredLessonRows.length === 0) {
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
      setVmStatusText('부팅 완료, 명령 입력 가능');

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
          announceAchievements(unlocked);
        }
      }
    },
    [announceAchievements],
  );

  const registerCommand = useCallback(
    (command: string) => {
      const normalizedCommand = command.trim();
      if (!normalizedCommand) {
        return;
      }

      setCommandHistory((previous) => appendHistory(previous, normalizedCommand, MAX_HISTORY));

      const actions = parseTmuxActionsFromCommand(normalizedCommand);
      if (actions.length > 0) {
        setActionHistory((previous) => appendActions(previous, actions, MAX_HISTORY));

        const unlocked = recordTmuxActivityRef.current({
          actions,
          lessonSlug: selectedLessonSlugRef.current,
        });
        if (unlocked.length > 0) {
          announceAchievements(unlocked);
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
      }
    },
    [announceAchievements],
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

      const gainedXp = recordMissionPass({
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

      if (lessonJustCompleted) {
        enqueueCelebration({
          key: `lesson:${selectedLesson.slug}`,
          kind: 'lesson',
          message: `레슨 완료: ${selectedLesson.title}`,
          detail: `${lessonMissions.length}개 미션을 모두 완료했습니다. XP +${gainedXp}`,
        });
      } else {
        enqueueCelebration({
          key: `mission:${missionSlug}`,
          kind: 'mission',
          message: mode === 'manual' ? `수동 완료 처리: ${selectedMission.title}` : `미션 완료: ${selectedMission.title}`,
          detail: mode === 'manual' ? `수동 브리지 기록 완료, XP +${gainedXp}` : `자동 판정 통과, XP +${gainedXp}`,
        });
      }

      const newlyUnlocked = useProgressStore
        .getState()
        .unlockedAchievements.filter((achievementId) => !previousUnlockedSet.has(achievementId));

      if (newlyUnlocked.length > 0) {
        announceAchievements(newlyUnlocked);
      }
    },
    [
      announceAchievements,
      completedMissionSlugs,
      content,
      enqueueCelebration,
      lessonMissions,
      recordMissionPass,
      selectedLesson,
      selectedMission,
      unlockedAchievements,
    ],
  );

  const sendInternalCommand = useCallback((command: string) => {
    const normalized = command.trim();
    if (!normalized || !emulatorRef.current) {
      return;
    }

    emulatorRef.current.serial0_send(`${normalized}\n`);
  }, []);

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
            registerCommand(command);
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
        registerCommand(normalized);
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
    setVmStatusText('v86 초기화 중');

    const host = terminalHostRef.current;
    if (!host) {
      setVmStatus('error');
      setVmStatusText('터미널 DOM 초기화 실패');
      return undefined;
    }

    setMetrics(createInitialMetrics());
    setActionHistory([]);
    setCommandHistory([]);
    setDebugLines([]);
    setCelebrationState({ active: null, queue: [] });
    seenCelebrationKeysRef.current.clear();
    inputLineBufferRef.current = '';
    inputEscapeSequenceRef.current = false;
    outputEscapeSequenceRef.current = false;
    lineBufferRef.current = '';
    probeLineBufferRef.current = '';
    vmInternalBridgeReadyRef.current = false;
    vmWarmBannerPendingRef.current = false;

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
          setVmStatusText('부팅 완료, 명령 입력 가능');
          setVmStatus('running');
        }

        if (hasShellPrompt && !vmInternalBridgeReadyRef.current && emulatorRef.current) {
          vmInternalBridgeReadyRef.current = true;
          if (vmWarmBannerPendingRef.current) {
            sendInternalCommand(BANNER_TRIGGER_COMMAND);
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
        setVmStatusText('VM 시작 이미지 확인 중...');

        const initialState = disableWarmStart ? null : await loadVmInitialState(VM_BOOT_CONFIG.initialStatePath);
        if (!isMounted) {
          return;
        }

        let useWarmStart = Boolean(initialState);
        if (useWarmStart) {
          setVmStatusText('빠른 시작 스냅샷 로딩 중...');
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
            setVmStatusText('빠른 시작 스냅샷 복원 실패, 일반 부팅으로 전환');
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
          setVmStatusText(useWarmStart ? '빠른 시작 스냅샷 복원 완료' : '커널 및 루트FS 로딩 완료');
        };

        stopListener = () => {
          setVmStatus('stopped');
          setVmStatusText('VM이 중지되었습니다');
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
        setVmStatusText('VM 부팅 중...');

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
              sendInternalCommand(BANNER_TRIGGER_COMMAND);
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
        setVmStatusText('v86 초기화 실패 (bios/wasm 경로 확인 필요)');
      }
    })();

    return () => {
      isMounted = false;

      inputLineBufferRef.current = '';
      inputEscapeSequenceRef.current = false;
      outputEscapeSequenceRef.current = false;
      probeLineBufferRef.current = '';

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
    contentState.status,
    disableWarmStart,
    pushDebugLine,
    sendInternalCommand,
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

  const lessonObjectivePreview = selectedLesson?.objectives.slice(0, 3) ?? [];
  const hiddenObjectiveCount = selectedLesson
    ? Math.max(selectedLesson.objectives.length - lessonObjectivePreview.length, 0)
    : 0;
  const lessonSuccessCriteriaPreview = selectedLesson?.successCriteria?.slice(0, 1) ?? [];
  const hiddenSuccessCriteriaCount = selectedLesson
    ? Math.max((selectedLesson.successCriteria?.length ?? 0) - lessonSuccessCriteriaPreview.length, 0)
    : 0;
  const lessonFailureStatePreview = selectedLesson?.failureStates?.slice(0, 1) ?? [];
  const hiddenFailureStateCount = selectedLesson
    ? Math.max((selectedLesson.failureStates?.length ?? 0) - lessonFailureStatePreview.length, 0)
    : 0;
  const missionHintPreview = selectedMission?.hints.slice(0, 2) ?? [];
  const hiddenMissionHintCount = selectedMission
    ? Math.max(selectedMission.hints.length - missionHintPreview.length, 0)
    : 0;
  const selectedMissionCommands = useMemo(() => buildMissionCommandSuggestions(selectedMission), [selectedMission]);
  const selectedMissionPreconditions = useMemo(
    () => buildMissionPreconditionItems(selectedMission, vmSnapshot),
    [selectedMission, vmSnapshot],
  );

  if (contentState.status === 'loading') {
    return (
      <PagePlaceholder
        eyebrow="Practice"
        title="Browser VM 초기화 중"
        description="커리큘럼과 VM 리소스를 로딩하고 있습니다."
      />
    );
  }

  if (contentState.status === 'error' || !content) {
    return (
      <PagePlaceholder
        eyebrow="Practice"
        title="VM Practice 로드 실패"
        description="커리큘럼 데이터를 읽지 못했습니다."
      >
        <div className="inline-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              window.location.reload();
            }}
          >
            새로고침
          </button>
        </div>
      </PagePlaceholder>
    );
  }

  return (
    <PagePlaceholder
      eyebrow="Practice"
      title="Browser VM tmux Lab"
      description="레거시 시뮬레이터를 대체한 실제 VM 기반 tmux 실습 환경입니다."
    >
      <div className="vm-poc-panel">
        <details className="vm-poc-note">
          <summary>실습 환경 안내</summary>
          <p>
            <strong>실행 방식:</strong> 브라우저 안에서 v86 + Alpine Linux + tmux를 직접 실행합니다. 입력은
            xterm.js를 통해 시리얼 콘솔로 전달됩니다.
          </p>
          <p>
            <strong>브리지:</strong> VM 출력에서 tmux 상태/행동을 probe로 수집해 미션 완료를 자동 판정합니다.
          </p>
        </details>

        {celebration ? (
          <section className={`vm-celebration-overlay ${isAchievementCelebration ? 'is-toast' : ''}`}>
            <section
              className={`vm-celebration vm-celebration-${celebration.kind} ${isAchievementCelebration ? 'is-toast' : ''}`}
              role={isAchievementCelebration ? 'status' : 'dialog'}
              aria-modal={isAchievementCelebration ? undefined : true}
              aria-live="polite"
              aria-label="완료 피드백"
            >
              <div className="vm-celebration-burst" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="vm-celebration-header">
                <span className={`vm-celebration-kind-chip is-${celebration.kind}`}>
                  {getCelebrationKindLabel(celebration.kind)}
                </span>
                {celebrationQueueCount > 0 ? (
                  <span className="vm-celebration-queue-chip">다음 {celebrationQueueCount}</span>
                ) : null}
              </div>
              <p>
                <strong>{celebration.message}</strong>
              </p>
              <p>{celebration.detail}</p>
              {celebration.kind === 'mission' && nextIncompleteMission ? (
                <section className="vm-celebration-next-action">
                  <p className="vm-celebration-next-label">추천 다음 단계</p>
                  <button
                    type="button"
                    className="primary-btn vm-celebration-primary-btn"
                    onClick={() => {
                      selectMissionForAction(nextIncompleteMission.slug);
                      advanceCelebration();
                    }}
                  >
                    다음 미션 시작
                  </button>
                  <p className="muted">다음: {nextIncompleteMission.title}</p>
                </section>
              ) : null}
              {celebration.kind === 'lesson' && nextLesson ? (
                <section className="vm-celebration-next-action">
                  <p className="vm-celebration-next-label">추천 다음 단계</p>
                  <button
                    type="button"
                    className="primary-btn vm-celebration-primary-btn"
                    onClick={() => {
                      selectNextLessonForAction();
                      advanceCelebration();
                    }}
                  >
                    다음 레슨 시작
                  </button>
                  <p className="muted">다음: {nextLesson.title}</p>
                </section>
              ) : null}
              {celebration.kind === 'lesson' && !nextLesson ? (
                <section className="vm-celebration-next-action">
                  <p className="vm-celebration-next-label">추천 다음 단계</p>
                  <Link className="primary-btn vm-celebration-primary-btn" to="/progress">
                    학습 완료 현황 보기
                  </Link>
                </section>
              ) : null}
              <div className="inline-actions vm-celebration-actions">
                <Link className="secondary-btn" to="/progress">
                  업적 보기
                </Link>
                {celebrationShareHref ? (
                  <a className="text-link" href={celebrationShareHref} target="_blank" rel="noreferrer">
                    X 챌린지 공유
                  </a>
                ) : null}
                <button
                  ref={celebrationCloseButtonRef}
                  type="button"
                  className="secondary-btn"
                  onClick={advanceCelebration}
                >
                  닫기 (Esc)
                </button>
              </div>
            </section>
          </section>
        ) : null}

        <div className="vm-mobile-switch" role="tablist" aria-label="실습 화면 전환">
          <button
            type="button"
            className={`secondary-btn ${mobileWorkbenchView === 'mission' ? 'is-active' : ''}`}
            onClick={() => setMobileWorkbenchView('mission')}
          >
            미션
          </button>
          <button
            type="button"
            className={`secondary-btn ${mobileWorkbenchView === 'terminal' ? 'is-active' : ''}`}
            onClick={() => setMobileWorkbenchView('terminal')}
          >
            터미널
          </button>
        </div>

        <section className={`vm-workbench vm-workbench-view-${mobileWorkbenchView}`}>
          <aside className="vm-study-panel">
            {selectedMission ? (
              <article className="vm-mission-card vm-mission-priority-card">
                <p className="vm-mission-priority-eyebrow">Priority 1</p>
                <h2>
                  현재 미션
                  {selectedMissionOrder ? ` ${selectedMissionOrder}/${lessonMissions.length}` : ''}
                </h2>
                <p className="muted">
                  {selectedMission.title} · 난이도 {getDifficultyLabel(selectedMission.difficulty)}
                </p>

                <section className="vm-mission-command-block">
                  <h3>이 미션에서 입력할 명령</h3>
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
                    <p className="muted">추천 명령을 찾지 못했습니다. 아래 힌트를 기준으로 직접 입력해 주세요.</p>
                  )}
                  <p className="muted">명령을 클릭하면 입력창에 채워지고 터미널 탭으로 전환됩니다.</p>
                </section>

                <section className="vm-mission-precondition-block">
                  <h3>실행 전 프리컨디션</h3>
                  <ul className="vm-precondition-list">
                    {selectedMissionPreconditions.map((item) => (
                      <li key={item.key} className={`vm-precondition-row ${item.satisfied ? 'is-satisfied' : 'is-pending'}`}>
                        <span>{item.label}</span>
                        <small>{item.current}</small>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="inline-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setMobileWorkbenchView('terminal')}
                  >
                    터미널로 바로 이동
                  </button>
                </div>

                <ul className="link-list">
                  {missionHintPreview.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
                {hiddenMissionHintCount > 0 ? (
                  <details className="vm-mission-hints-more">
                    <summary>힌트 {hiddenMissionHintCount}개 더 보기</summary>
                    <ul className="link-list">
                      {selectedMission.hints.slice(missionHintPreview.length).map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {selectedMissionStatus ? (
                  <div className="vm-mission-status">
                    <p>
                      <strong>판정:</strong> {selectedMissionStatus.status} · {selectedMissionStatus.reason}
                    </p>
                    {selectedMissionStatus.status === 'manual' ? (
                      <button type="button" className="secondary-btn" onClick={handleManualMissionComplete}>
                        수동 완료 처리
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ) : null}

            <section className="vm-next-action-card">
              <p className="vm-next-action-eyebrow">Next Action</p>
              <h2>지금 할 일</h2>
              {!selectedMission ? (
                <p className="muted">미션을 선택하면 바로 실행할 다음 행동을 안내합니다.</p>
              ) : null}
              {selectedMission && selectedMissionStatus?.status === 'complete' && !selectedMissionCompleted ? (
                <p className="muted">완료 판정 반영 중입니다. 잠시 후 자동으로 완료 처리됩니다.</p>
              ) : null}
              {selectedMission && selectedMissionCompleted && nextIncompleteMission ? (
                <>
                  <p>
                    <strong>{selectedMission.title}</strong> 완료됨. 다음 미션으로 이동해 이어서 진행하세요.
                  </p>
                  <button
                    type="button"
                    className="primary-btn vm-next-action-btn"
                    onClick={() => selectMissionForAction(nextIncompleteMission.slug)}
                  >
                    다음 미션으로 이동
                  </button>
                  <p className="muted">다음: {nextIncompleteMission.title}</p>
                </>
              ) : null}
              {selectedMission && selectedMissionCompleted && !nextIncompleteMission && lessonCompleted && nextLesson ? (
                <>
                  <p>
                    <strong>현재 레슨 완료.</strong> 다음 레슨으로 넘어가 학습 흐름을 이어가세요.
                  </p>
                  <button type="button" className="primary-btn vm-next-action-btn" onClick={selectNextLessonForAction}>
                    다음 레슨 시작
                  </button>
                  <p className="muted">다음: {nextLesson.title}</p>
                </>
              ) : null}
              {selectedMission && selectedMissionCompleted && !nextIncompleteMission && lessonCompleted && !nextLesson ? (
                <>
                  <p>
                    <strong>전체 레슨을 완료했습니다.</strong> 진행 현황에서 업적과 누적 XP를 확인하세요.
                  </p>
                  <Link className="primary-btn vm-next-action-btn" to="/progress">
                    진행 현황 보기
                  </Link>
                </>
              ) : null}
              {selectedMission && !selectedMissionCompleted && selectedMissionStatus?.status === 'manual' ? (
                <>
                  <p>
                    <strong>{selectedMission.title}</strong>는 자동 판정이 어려워 수동 완료가 필요합니다.
                  </p>
                  <button type="button" className="primary-btn vm-next-action-btn" onClick={handleManualMissionComplete}>
                    수동 완료 처리
                  </button>
                </>
              ) : null}
              {selectedMission &&
              !selectedMissionCompleted &&
              selectedMissionStatus?.status !== 'manual' &&
              selectedMissionStatus?.status !== 'complete' ? (
                <>
                  <p>
                    <strong>{selectedMission.title}</strong> 미션 수행 중입니다. 터미널에서 힌트를 실행하고 완료 판정을 받으세요.
                  </p>
                  <button
                    type="button"
                    className="primary-btn vm-next-action-btn"
                    onClick={() => setMobileWorkbenchView('terminal')}
                  >
                    터미널로 이동
                  </button>
                </>
              ) : null}
              {selectedMissionStatus ? (
                <p className="vm-next-action-meta">
                  현재 판정: {selectedMissionStatus.status} · {selectedMissionStatus.reason}
                </p>
              ) : null}
            </section>

            <section className="vm-mission-list-card">
              <h2>미션 목록</h2>
              <div className="vm-mission-list">
                {lessonMissions.map((mission, index) => {
                  const missionStatus = missionStatusMap.get(mission.slug);
                  const isSelected = mission.slug === selectedMissionSlug;
                  const isCompleted = completedMissionSlugs.includes(mission.slug);

                  let badgeClass = 'is-pending';
                  let badgeLabel = '대기';

                  if (isCompleted) {
                    badgeClass = 'is-complete';
                    badgeLabel = '완료';
                  } else if (missionStatus?.status === 'complete') {
                    badgeClass = 'is-live-complete';
                    badgeLabel = '실시간 통과';
                  } else if (missionStatus?.status === 'manual') {
                    badgeClass = 'is-manual';
                    badgeLabel = '수동';
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
                          {index + 1}. {mission.title}
                        </strong>
                        <small>난이도 {getDifficultyLabel(mission.difficulty)}</small>
                      </span>
                      <span className={`vm-mission-row-badge ${badgeClass}`}>{badgeLabel}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedMissionSession ? (
              <section className="vm-session-card">
                <p className="vm-session-card-eyebrow">현재 세션 상태</p>
                <p>
                  <strong>
                    {selectedMissionSession.status === 'completed' ? '완료됨' : '진행 중'}
                  </strong>
                </p>
                <p className="muted">시작: {formatSessionDateTime(selectedMissionSession.startedAt)}</p>
                {selectedMissionSession.completedAt ? (
                  <p className="muted">완료: {formatSessionDateTime(selectedMissionSession.completedAt)}</p>
                ) : null}
                {selectedMissionSession.gainedXp !== null ? (
                  <p className="muted">획득 XP: +{selectedMissionSession.gainedXp}</p>
                ) : null}
              </section>
            ) : null}

            {selectedLesson ? (
              <section className="vm-lesson-card">
                <p className="vm-lesson-card-path">
                  {selectedLessonTrack?.title ?? selectedLesson.trackSlug} ·{' '}
                  {selectedLessonChapter?.title ?? selectedLesson.chapterSlug}
                </p>
                <h2>{selectedLesson.title}</h2>
                <p className="muted">
                  예상 {selectedLesson.estimatedMinutes}분 · 목표 {selectedLesson.objectives.length}개
                </p>
                {selectedLesson.goal ? (
                  <p>
                    <strong>레슨 목표:</strong> {selectedLesson.goal}
                  </p>
                ) : null}
                {lessonSuccessCriteriaPreview.length > 0 ? (
                  <p className="muted">
                    <strong>완료 기준:</strong> {lessonSuccessCriteriaPreview[0]}
                    {hiddenSuccessCriteriaCount > 0 ? ` (+${hiddenSuccessCriteriaCount}개)` : ''}
                  </p>
                ) : null}
                {lessonFailureStatePreview.length > 0 ? (
                  <p className="muted">
                    <strong>부족 상태:</strong> {lessonFailureStatePreview[0]}
                    {hiddenFailureStateCount > 0 ? ` (+${hiddenFailureStateCount}개)` : ''}
                  </p>
                ) : null}
                <ul className="link-list">
                  {lessonObjectivePreview.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                  {hiddenObjectiveCount > 0 ? <li className="muted">+ {hiddenObjectiveCount}개 목표 더 있음</li> : null}
                </ul>
                <div className="inline-actions">
                  <Link
                    className="secondary-btn"
                    to={`/learn/${selectedLesson.trackSlug}/${selectedLesson.chapterSlug}/${selectedLesson.slug}`}
                  >
                    레슨 상세 보기
                  </Link>
                </div>
              </section>
            ) : null}

            <section className="vm-curriculum-panel vm-curriculum-row-layout">
              <div className="inline-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => selectLessonForAction(BEGINNER_ENTRY_LESSON, { resetFilter: true })}
                >
                  초급 코어
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => selectLessonForAction(ADVANCED_ENTRY_LESSON, { resetFilter: true })}
                >
                  심화 과정
                </button>
              </div>
              <div className="vm-lesson-filter" role="tablist" aria-label="레슨 필터">
                {LESSON_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`secondary-btn vm-lesson-filter-btn ${lessonFilter === option.value ? 'is-active' : ''}`}
                    onClick={() => setLessonFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <section className="vm-lesson-catalog" aria-label="레슨 목록">
                {filteredLessonRows.length === 0 ? (
                  <p className="muted">선택한 필터에 해당하는 레슨이 없습니다.</p>
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
                          <strong>{row.lesson.title}</strong>
                          <small>
                            {trackTitle} · {chapterTitle}
                          </small>
                        </span>
                        <span className="vm-lesson-row-meta">
                          <small>
                            {row.completedMissionCount}/{row.totalMissionCount}
                          </small>
                          <span className={`vm-lesson-row-status ${getLessonStatusClass(row.status)}`}>
                            {getLessonStatusLabel(row.status)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </section>
              <div className="vm-lesson-progress">
                <p>
                  <strong>Lesson 진행:</strong> {lessonCompletedMissionCount}/{lessonMissions.length}
                </p>
                <p className="muted">manual 판정 미션: {manualMissionCandidates.length}</p>
              </div>
              <div className={`vm-runtime-badge ${getMetricBadgeClass(vmStatus)}`}>
                <span>VM 상태: {vmStatus}</span>
                <span>{vmStatusText}</span>
              </div>
            </section>
          </aside>

          <section className="vm-lab-panel">
            <section className="vm-poc-controls">
              <div className="inline-actions">
                <Link className="secondary-btn" to="/learn">
                  커리큘럼으로 이동
                </Link>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setVmEpoch((value) => value + 1);
                  }}
                >
                  VM 재시작
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
                  Probe 지금 실행
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
                  명령 실행
                </button>
              </form>

              <details className="vm-poc-quick-wrap">
                <summary>자주 쓰는 명령 빠르게 실행</summary>
                <div className="vm-poc-quick">
                  {QUICK_COMMANDS.map((item) => (
                    <button key={item.label} type="button" className="secondary-btn" onClick={() => sendCommand(item.command)}>
                      {item.label}
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
              <summary>브리지 디버그</summary>
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
