import { describe, expect, it } from 'vitest';
import type { VmProbeMetric, VmProbeStateSnapshot } from '../../features/vm/missionBridge';
import {
  applyProbeMetricToVmMetrics,
  applyProbeStateSnapshotToVmMetrics,
  createInitialMetricHighlightState,
  createInitialMetrics,
  mapProbeMetricToVmMetricKey,
} from './vmMetrics';

describe('vmMetrics', () => {
  it('creates empty metric and highlight states', () => {
    expect(createInitialMetrics()).toEqual({
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
    });

    expect(createInitialMetricHighlightState()).toEqual({
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
    });
  });

  it('maps probe metric keys to vm metric keys', () => {
    expect(mapProbeMetricToVmMetricKey('session')).toBe('sessionCount');
    expect(mapProbeMetricToVmMetricKey('layout')).toBe('windowLayout');
    expect(mapProbeMetricToVmMetricKey('windowName')).toBe('windowName');
    expect(mapProbeMetricToVmMetricKey('searchMatched')).toBe('searchMatchFound');
    expect(mapProbeMetricToVmMetricKey('tmux')).toBeNull();
  });

  it('applies numeric probe metric and reports change', () => {
    const previous = createInitialMetrics();
    const probeMetric: VmProbeMetric = { key: 'session', value: 2 };

    const result = applyProbeMetricToVmMetrics(previous, probeMetric);
    expect(result.changed).toBe(true);
    expect(result.metricKey).toBe('sessionCount');
    expect(result.nextMetrics.sessionCount).toBe(2);
  });

  it('does not report change when probe value is unchanged', () => {
    const previous = {
      ...createInitialMetrics(),
      paneCount: 3,
    };
    const probeMetric: VmProbeMetric = { key: 'pane', value: 3 };

    const result = applyProbeMetricToVmMetrics(previous, probeMetric);
    expect(result.changed).toBe(false);
    expect(result.metricKey).toBe('paneCount');
    expect(result.nextMetrics).toBe(previous);
  });

  it('normalizes text metrics and numeric fallback metrics', () => {
    const seeded = {
      ...createInitialMetrics(),
      sessionName: 'lesson',
      windowName: 'win',
      windowLayout: 'old-layout',
      activeWindowIndex: 2,
    };

    const sessionNameResult = applyProbeMetricToVmMetrics(seeded, {
      key: 'sessionName',
      value: '  lesson-main  ',
    });
    expect(sessionNameResult.nextMetrics.sessionName).toBe('lesson-main');

    const layoutResult = applyProbeMetricToVmMetrics(seeded, {
      key: 'layout',
      value: '  bb2d,237x63,0,0,0  ',
    });
    expect(layoutResult.nextMetrics.windowLayout).toBe('bb2d,237x63,0,0,0');

    const windowNameResult = applyProbeMetricToVmMetrics(seeded, {
      key: 'windowName',
      value: '  main  ',
    });
    expect(windowNameResult.nextMetrics.windowName).toBe('main');

    const activeWindowResult = applyProbeMetricToVmMetrics(seeded, {
      key: 'activeWindow',
      value: -1,
    });
    expect(activeWindowResult.nextMetrics.activeWindowIndex).toBeNull();
  });

  it('keeps existing names when empty text probes arrive while counts are active', () => {
    const seeded = {
      ...createInitialMetrics(),
      sessionCount: 1,
      windowCount: 2,
      sessionName: 'lesson',
      windowName: 'dev',
    };

    const sessionNameResult = applyProbeMetricToVmMetrics(seeded, {
      key: 'sessionName',
      value: '   ',
    });
    expect(sessionNameResult.changed).toBe(false);
    expect(sessionNameResult.nextMetrics.sessionName).toBe('lesson');

    const windowNameResult = applyProbeMetricToVmMetrics(seeded, {
      key: 'windowName',
      value: '   ',
    });
    expect(windowNameResult.changed).toBe(false);
    expect(windowNameResult.nextMetrics.windowName).toBe('dev');
  });

  it('clears names when corresponding counts are zero', () => {
    const seeded = {
      ...createInitialMetrics(),
      sessionCount: 0,
      windowCount: 0,
      sessionName: 'lesson',
      windowName: 'dev',
    };

    const sessionNameResult = applyProbeMetricToVmMetrics(seeded, {
      key: 'sessionName',
      value: '   ',
    });
    expect(sessionNameResult.changed).toBe(true);
    expect(sessionNameResult.nextMetrics.sessionName).toBeNull();

    const windowNameResult = applyProbeMetricToVmMetrics(seeded, {
      key: 'windowName',
      value: '   ',
    });
    expect(windowNameResult.changed).toBe(true);
    expect(windowNameResult.nextMetrics.windowName).toBeNull();
  });

  it('maps mode/sync/search probes to booleans and nullable mode', () => {
    let current = createInitialMetrics();

    current = applyProbeMetricToVmMetrics(current, { key: 'mode', value: 1 }).nextMetrics;
    expect(current.modeIs).toBe('COPY_MODE');

    current = applyProbeMetricToVmMetrics(current, { key: 'mode', value: 0 }).nextMetrics;
    expect(current.modeIs).toBeNull();

    current = applyProbeMetricToVmMetrics(current, { key: 'sync', value: 1 }).nextMetrics;
    expect(current.paneSynchronized).toBe(true);

    current = applyProbeMetricToVmMetrics(current, { key: 'search', value: 1 }).nextMetrics;
    expect(current.searchExecuted).toBe(true);

    current = applyProbeMetricToVmMetrics(current, { key: 'searchMatched', value: 0 }).nextMetrics;
    expect(current.searchMatchFound).toBe(false);
  });

  it('ignores tmux probe metrics as no-op', () => {
    const previous = createInitialMetrics();
    const result = applyProbeMetricToVmMetrics(previous, { key: 'tmux', value: 1 });

    expect(result.changed).toBe(false);
    expect(result.metricKey).toBeNull();
    expect(result.nextMetrics).toBe(previous);
  });

  it('applies probe state snapshot in one pass and reports changed keys', () => {
    const previous = createInitialMetrics();
    const snapshot: VmProbeStateSnapshot = {
      tmux: 1,
      session: 2,
      window: 3,
      pane: 4,
      mode: 1,
      sessionName: ' lesson ',
      windowName: ' main ',
      activeWindow: 2,
      layout: ' bb2d,120x40,0,0,0 ',
      zoomed: 1,
      sync: 0,
      search: 1,
      searchMatched: 1,
    };

    const result = applyProbeStateSnapshotToVmMetrics(previous, snapshot);
    expect(result.changed).toBe(true);
    expect(result.nextMetrics).toEqual({
      sessionCount: 2,
      windowCount: 3,
      paneCount: 4,
      modeIs: 'COPY_MODE',
      sessionName: 'lesson',
      windowName: 'main',
      activeWindowIndex: 2,
      windowLayout: 'bb2d,120x40,0,0,0',
      windowZoomed: true,
      paneSynchronized: false,
      searchExecuted: true,
      searchMatchFound: true,
    });
    expect(result.changedMetricKeys).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it('stabilizes empty names in snapshot while counts remain active', () => {
    const previous = {
      ...createInitialMetrics(),
      sessionCount: 1,
      windowCount: 1,
      sessionName: 'lesson',
      windowName: 'dev',
    };
    const snapshot: VmProbeStateSnapshot = {
      tmux: 1,
      session: 1,
      window: 1,
      pane: 1,
      mode: 0,
      sessionName: '   ',
      windowName: '   ',
      activeWindow: 0,
      layout: 'layout',
      zoomed: 0,
      sync: 0,
      search: 0,
      searchMatched: 0,
    };

    const result = applyProbeStateSnapshotToVmMetrics(previous, snapshot);
    expect(result.nextMetrics.sessionName).toBe('lesson');
    expect(result.nextMetrics.windowName).toBe('dev');
  });

  it('returns previous object when snapshot does not change metrics', () => {
    const previous = {
      ...createInitialMetrics(),
      sessionCount: 1,
      windowCount: 1,
      paneCount: 1,
      modeIs: null,
      sessionName: 'lesson',
      windowName: 'dev',
      activeWindowIndex: 0,
      windowLayout: 'layout',
      windowZoomed: false,
      paneSynchronized: false,
      searchExecuted: false,
      searchMatchFound: false,
    };
    const snapshot: VmProbeStateSnapshot = {
      tmux: 1,
      session: 1,
      window: 1,
      pane: 1,
      mode: 0,
      sessionName: 'lesson',
      windowName: 'dev',
      activeWindow: 0,
      layout: 'layout',
      zoomed: 0,
      sync: 0,
      search: 0,
      searchMatched: 0,
    };

    const result = applyProbeStateSnapshotToVmMetrics(previous, snapshot);
    expect(result.changed).toBe(false);
    expect(result.changedMetricKeys).toEqual([]);
    expect(result.nextMetrics).toBe(previous);
  });
});
