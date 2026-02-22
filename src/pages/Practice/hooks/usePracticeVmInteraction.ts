import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import type V86 from 'v86';
import type { V86Options } from 'v86';
import { parseTmuxActionsFromCommand, type VmProbeMetric } from '../../../features/vm/missionBridge';
import { PROBE_TRIGGER_COMMAND, SEARCH_PROBE_TRIGGER_COMMAND } from '../probeCommands';
import { applyProbeMetricToVmMetrics, type VmMetricState, type VmMetricKey } from '../vmMetrics';
import type { useProgressStore } from '../../../features/progress/progressStore';
import type { VmBootConfig } from '../vmBoot';

type VmStatus = 'idle' | 'booting' | 'running' | 'stopped' | 'error';

type RegisterCommandOptions = {
  source?: 'shell' | 'shortcut';
  extraActions?: string[];
};

type UsePracticeVmInteractionArgs = {
  t: TFunction;
  autoProbe: boolean;
  vmStatus: VmStatus;
  vmStatusText: string;
  metrics: VmMetricState;
  actionHistory: string[];
  commandHistory: string[];
  debugLines: string[];
  setVmStatus: Dispatch<SetStateAction<VmStatus>>;
  setVmStatusText: Dispatch<SetStateAction<string>>;
  setMetrics: Dispatch<SetStateAction<VmMetricState>>;
  setActionHistory: Dispatch<SetStateAction<string[]>>;
  setCommandHistory: Dispatch<SetStateAction<string[]>>;
  setDebugLines: Dispatch<SetStateAction<string[]>>;
  metricsRef: MutableRefObject<VmMetricState>;
  selectedLessonSlugRef: MutableRefObject<string>;
  emulatorRef: MutableRefObject<V86 | null>;
  vmInternalBridgeReadyRef: MutableRefObject<boolean>;
  searchProbeTimerRef: MutableRefObject<number | null>;
  lastEmulatorOptionsRef: MutableRefObject<V86Options | null>;
  recordTmuxActivityRef: MutableRefObject<ReturnType<typeof useProgressStore.getState>['recordTmuxActivity']>;
  triggerMetricVisualEffect: (metricKey: VmMetricKey | null) => void;
  bootConfig: VmBootConfig;
};

type UsePracticeVmInteractionResult = {
  pushDebugLine: (line: string) => void;
  updateMetricByProbe: (metric: VmProbeMetric) => void;
  sendInternalCommand: (command: string) => void;
  requestSearchProbe: () => void;
  registerCommand: (command: string, options?: RegisterCommandOptions) => void;
  sendCommand: (command: string, options?: { trackCommand?: boolean }) => void;
};

const MAX_HISTORY = 240;
const MAX_DEBUG_LINES = 220;
const AUTO_PROBE_INTERVAL_MS = 280;
const POST_COMMAND_PROBE_DELAY_MS = 120;

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

export function usePracticeVmInteraction({
  t,
  autoProbe,
  vmStatus,
  vmStatusText,
  metrics,
  actionHistory,
  commandHistory,
  debugLines,
  setVmStatus,
  setVmStatusText,
  setMetrics,
  setActionHistory,
  setCommandHistory,
  setDebugLines,
  metricsRef,
  selectedLessonSlugRef,
  emulatorRef,
  vmInternalBridgeReadyRef,
  searchProbeTimerRef,
  lastEmulatorOptionsRef,
  recordTmuxActivityRef,
  triggerMetricVisualEffect,
  bootConfig,
}: UsePracticeVmInteractionArgs): UsePracticeVmInteractionResult {
  const postCommandProbeTimerRef = useRef<number | null>(null);

  const pushDebugLine = useCallback(
    (line: string) => {
      const normalized = line.trimEnd();
      if (!normalized) {
        return;
      }

      setDebugLines((previous) => trimHistory([...previous, normalized], MAX_DEBUG_LINES));
    },
    [setDebugLines],
  );

  const updateMetricByProbe = useCallback(
    (metric: VmProbeMetric) => {
      setVmStatus('running');
      setVmStatusText(t('부팅 완료, 명령 입력 가능'));
      const currentUpdateResult = applyProbeMetricToVmMetrics(metricsRef.current, metric);

      setMetrics((previous) => applyProbeMetricToVmMetrics(previous, metric).nextMetrics);
      if (currentUpdateResult.changed && currentUpdateResult.metricKey) {
        triggerMetricVisualEffect(currentUpdateResult.metricKey);
      }

      if (metric.key === 'pane' || metric.key === 'layout' || metric.key === 'zoomed' || metric.key === 'sync') {
        const nextPaneCount = metric.key === 'pane' ? (metric.value >= 0 ? metric.value : null) : undefined;
        const nextLayout = metric.key === 'layout' ? metric.value.trim() || null : undefined;
        const nextZoomed = metric.key === 'zoomed' ? metric.value === 1 : undefined;
        const nextSynchronized = metric.key === 'sync' ? metric.value === 1 : undefined;
        recordTmuxActivityRef.current({
          actions: [],
          paneCount: nextPaneCount,
          windowLayout: nextLayout,
          windowZoomed: nextZoomed,
          paneSynchronized: nextSynchronized,
          lessonSlug: selectedLessonSlugRef.current,
        });
      }
    },
    [
      metricsRef,
      recordTmuxActivityRef,
      selectedLessonSlugRef,
      setMetrics,
      setVmStatus,
      setVmStatusText,
      t,
      triggerMetricVisualEffect,
    ],
  );

  const sendInternalCommand = useCallback(
    (command: string) => {
      const normalized = command.trim();
      if (!normalized || !emulatorRef.current) {
        return;
      }

      const payload = new TextEncoder().encode(`${normalized}\n`);
      emulatorRef.current.serial_send_bytes(2, payload);
    },
    [emulatorRef],
  );

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
  }, [emulatorRef, searchProbeTimerRef, sendInternalCommand, vmInternalBridgeReadyRef]);

  const scheduleProbeSoon = useCallback(() => {
    if (!emulatorRef.current || !vmInternalBridgeReadyRef.current) {
      return;
    }

    if (postCommandProbeTimerRef.current !== null) {
      window.clearTimeout(postCommandProbeTimerRef.current);
    }

    postCommandProbeTimerRef.current = window.setTimeout(() => {
      postCommandProbeTimerRef.current = null;
      sendInternalCommand(PROBE_TRIGGER_COMMAND);
    }, POST_COMMAND_PROBE_DELAY_MS);
  }, [emulatorRef, sendInternalCommand, vmInternalBridgeReadyRef]);

  const registerCommand = useCallback(
    (command: string, options?: RegisterCommandOptions) => {
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

        recordTmuxActivityRef.current({
          actions: uniqueActions,
          lessonSlug: selectedLessonSlugRef.current,
        });
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

      if (normalizedCommand.includes('tmux')) {
        scheduleProbeSoon();
      }
    },
    [
      recordTmuxActivityRef,
      requestSearchProbe,
      scheduleProbeSoon,
      selectedLessonSlugRef,
      setActionHistory,
      setCommandHistory,
      setMetrics,
    ],
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
    [emulatorRef, registerCommand],
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
      injectProbeMetric: (metric: VmProbeMetric) => {
        updateMetricByProbe(metric);
      },
      injectCommandHistory: (command: string) => {
        registerCommand(command, { source: 'shell' });
      },
      injectActionHistory: (action: string) => {
        setActionHistory((previous) => appendActions(previous, [action], MAX_HISTORY));
      },
      getBootConfig: () => bootConfig,
      getLastEmulatorOptions: () => lastEmulatorOptionsRef.current,
    };

    return () => {
      delete window.__tmuxwebVmBridge;
    };
  }, [
    actionHistory,
    bootConfig,
    commandHistory,
    debugLines,
    emulatorRef,
    lastEmulatorOptionsRef,
    metrics,
    sendCommand,
    sendInternalCommand,
    registerCommand,
    setActionHistory,
    updateMetricByProbe,
    vmStatus,
    vmStatusText,
  ]);

  useEffect(() => {
    if (!autoProbe) {
      return;
    }

    const triggerProbe = () => {
      if (!vmInternalBridgeReadyRef.current || !emulatorRef.current) {
        return;
      }

      sendInternalCommand(PROBE_TRIGGER_COMMAND);
    };

    triggerProbe();
    const timer = window.setInterval(triggerProbe, AUTO_PROBE_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [autoProbe, emulatorRef, sendInternalCommand, vmInternalBridgeReadyRef, vmStatus]);

  useEffect(() => {
    return () => {
      if (postCommandProbeTimerRef.current !== null) {
        window.clearTimeout(postCommandProbeTimerRef.current);
        postCommandProbeTimerRef.current = null;
      }
    };
  }, []);

  return {
    pushDebugLine,
    updateMetricByProbe,
    sendInternalCommand,
    requestSearchProbe,
    registerCommand,
    sendCommand,
  };
}
