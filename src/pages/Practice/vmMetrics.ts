import type { VmProbeMetric } from '../../features/vm/missionBridge';

export type VmMetricState = {
  sessionCount: number | null;
  windowCount: number | null;
  paneCount: number | null;
  modeIs: string | null;
  sessionName: string | null;
  windowName: string | null;
  activeWindowIndex: number | null;
  windowLayout: string | null;
  windowZoomed: boolean | null;
  paneSynchronized: boolean | null;
  searchExecuted: boolean | null;
  searchMatchFound: boolean | null;
};

export type VmMetricKey = keyof VmMetricState;
export type VmMetricHighlightState = Record<VmMetricKey, boolean>;

export const VM_METRIC_KEYS: VmMetricKey[] = [
  'sessionCount',
  'windowCount',
  'paneCount',
  'modeIs',
  'sessionName',
  'windowName',
  'activeWindowIndex',
  'windowLayout',
  'windowZoomed',
  'paneSynchronized',
  'searchExecuted',
  'searchMatchFound',
];

type VmMetricProbeUpdate = {
  key: VmMetricKey;
  value: VmMetricState[VmMetricKey];
};

export function createInitialMetrics(): VmMetricState {
  return {
    sessionCount: null,
    windowCount: null,
    paneCount: null,
    modeIs: null,
    sessionName: null,
    windowName: null,
    activeWindowIndex: null,
    windowLayout: null,
    windowZoomed: null,
    paneSynchronized: null,
    searchExecuted: null,
    searchMatchFound: null,
  };
}

export function createInitialMetricHighlightState(): VmMetricHighlightState {
  return {
    sessionCount: false,
    windowCount: false,
    paneCount: false,
    modeIs: false,
    sessionName: false,
    windowName: false,
    activeWindowIndex: false,
    windowLayout: false,
    windowZoomed: false,
    paneSynchronized: false,
    searchExecuted: false,
    searchMatchFound: false,
  };
}

export function mapProbeMetricToVmMetricKey(probeMetricKey: VmProbeMetric['key']): VmMetricKey | null {
  switch (probeMetricKey) {
    case 'session':
      return 'sessionCount';
    case 'window':
      return 'windowCount';
    case 'pane':
      return 'paneCount';
    case 'mode':
      return 'modeIs';
    case 'sessionName':
      return 'sessionName';
    case 'windowName':
      return 'windowName';
    case 'activeWindow':
      return 'activeWindowIndex';
    case 'layout':
      return 'windowLayout';
    case 'zoomed':
      return 'windowZoomed';
    case 'sync':
      return 'paneSynchronized';
    case 'search':
      return 'searchExecuted';
    case 'searchMatched':
      return 'searchMatchFound';
    case 'tmux':
    default:
      return null;
  }
}

function resolveProbeMetricUpdate(metric: VmProbeMetric): VmMetricProbeUpdate | null {
  const metricKey = mapProbeMetricToVmMetricKey(metric.key);
  if (!metricKey) {
    return null;
  }

  switch (metric.key) {
    case 'session':
      return { key: 'sessionCount', value: metric.value >= 0 ? metric.value : null };
    case 'window':
      return { key: 'windowCount', value: metric.value >= 0 ? metric.value : null };
    case 'pane':
      return { key: 'paneCount', value: metric.value >= 0 ? metric.value : null };
    case 'mode':
      return { key: 'modeIs', value: metric.value === 1 ? 'COPY_MODE' : null };
    case 'sessionName':
      return { key: 'sessionName', value: metric.value.trim() || null };
    case 'windowName':
      return { key: 'windowName', value: metric.value.trim() || null };
    case 'activeWindow':
      return { key: 'activeWindowIndex', value: metric.value >= 0 ? metric.value : null };
    case 'layout':
      return { key: 'windowLayout', value: metric.value.trim() || null };
    case 'zoomed':
      return { key: 'windowZoomed', value: metric.value === 1 };
    case 'sync':
      return { key: 'paneSynchronized', value: metric.value === 1 };
    case 'search':
      return { key: 'searchExecuted', value: metric.value === 1 };
    case 'searchMatched':
      return { key: 'searchMatchFound', value: metric.value === 1 };
    case 'tmux':
    default:
      return null;
  }
}

function stabilizeTextMetricUpdate(previous: VmMetricState, metricUpdate: VmMetricProbeUpdate): VmMetricProbeUpdate {
  if (metricUpdate.value !== null) {
    return metricUpdate;
  }

  if (
    metricUpdate.key === 'sessionName' &&
    previous.sessionName !== null &&
    (previous.sessionCount === null || previous.sessionCount > 0)
  ) {
    return { ...metricUpdate, value: previous.sessionName };
  }

  if (
    metricUpdate.key === 'windowName' &&
    previous.windowName !== null &&
    (previous.windowCount === null || previous.windowCount > 0)
  ) {
    return { ...metricUpdate, value: previous.windowName };
  }

  return metricUpdate;
}

export function applyProbeMetricToVmMetrics(previous: VmMetricState, metric: VmProbeMetric) {
  const metricUpdate = resolveProbeMetricUpdate(metric);
  if (!metricUpdate) {
    return {
      nextMetrics: previous,
      changed: false,
      metricKey: null as VmMetricKey | null,
    };
  }

  const stabilizedMetricUpdate = stabilizeTextMetricUpdate(previous, metricUpdate);
  const previousValue = previous[stabilizedMetricUpdate.key];
  if (previousValue === stabilizedMetricUpdate.value) {
    return {
      nextMetrics: previous,
      changed: false,
      metricKey: stabilizedMetricUpdate.key,
    };
  }

  return {
    nextMetrics: {
      ...previous,
      [stabilizedMetricUpdate.key]: stabilizedMetricUpdate.value,
    } as VmMetricState,
    changed: true,
    metricKey: stabilizedMetricUpdate.key,
  };
}
