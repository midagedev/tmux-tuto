import type { TFunction } from 'i18next';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import type { LessonCompletionStatus } from './lessonProgress';
import type { VmBridgeSnapshot } from '../../features/vm/missionBridge';
import type { VmMetricKey, VmMetricState } from './vmMetrics';

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

const SHORTCUT_TOOLTIP_TEXT = '입력 순서: Ctrl 키를 누른 채 b를 누른 뒤 손을 떼고, 다음 키를 입력하세요.';

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

export function renderHintTextWithTooltips(hint: string, keyPrefix: string, t: TFunction) {
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

const ACTION_HISTORY_COMMAND_SUGGESTIONS: Record<string, string> = {
  'sim.pane.resize': 'tmux resize-pane -R 5',
  'sim.pane.join': 'tmux join-pane -hb -s :.3 -t :.0',
  'sim.command.prompt': 'tmux command-prompt -p "cmd"',
  'sim.choose.tree': 'tmux choose-tree -Z',
};

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

export function buildMissionCommandSuggestions(mission: AppMission | null) {
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

export type MissionPreconditionItem = {
  key: string;
  label: string;
  current: string;
  satisfied: boolean;
};

export function buildMissionPreconditionItems(
  t: TFunction,
  mission: AppMission | null,
  snapshot: VmBridgeSnapshot,
): MissionPreconditionItem[] {
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

export function computeCompletedTrackSlugs(content: AppContent, completedMissionSlugs: string[]) {
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

export function formatLayout(layout: string | null) {
  if (!layout) {
    return '-';
  }

  if (layout.length <= 28) {
    return layout;
  }

  return `${layout.slice(0, 28)}...`;
}

export type VmMetricStatusItem = {
  key: VmMetricKey;
  label: string;
  value: string | number;
};

export function buildMetricStatusItems(metrics: VmMetricState): VmMetricStatusItem[] {
  return [
    { key: 'sessionCount', label: 'sessions', value: metrics.sessionCount ?? '-' },
    { key: 'sessionName', label: 'sessionName', value: metrics.sessionName ?? '-' },
    { key: 'windowName', label: 'windowName', value: metrics.windowName ?? '-' },
    { key: 'windowCount', label: 'windows', value: metrics.windowCount ?? '-' },
    { key: 'paneCount', label: 'panes', value: metrics.paneCount ?? '-' },
    { key: 'activeWindowIndex', label: 'activeWindow', value: metrics.activeWindowIndex ?? '-' },
    { key: 'windowZoomed', label: 'zoom', value: metrics.windowZoomed === null ? '-' : metrics.windowZoomed ? 'yes' : 'no' },
    {
      key: 'paneSynchronized',
      label: 'sync',
      value: metrics.paneSynchronized === null ? '-' : metrics.paneSynchronized ? 'yes' : 'no',
    },
    { key: 'windowLayout', label: 'layout', value: formatLayout(metrics.windowLayout) },
    { key: 'modeIs', label: 'mode', value: metrics.modeIs ?? '-' },
    {
      key: 'searchExecuted',
      label: 'search',
      value: metrics.searchExecuted === null ? '-' : metrics.searchExecuted ? 'yes' : 'no',
    },
    {
      key: 'searchMatchFound',
      label: 'match',
      value: metrics.searchMatchFound === null ? '-' : metrics.searchMatchFound ? 'yes' : 'no',
    },
  ];
}

export function getDifficultyLabel(t: TFunction, difficulty: AppMission['difficulty']) {
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

export function getMetricBadgeClass(status: 'idle' | 'booting' | 'running' | 'stopped' | 'error') {
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

export function getLessonStatusLabel(t: TFunction, status: LessonCompletionStatus) {
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

export function getLessonStatusClass(status: LessonCompletionStatus) {
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
