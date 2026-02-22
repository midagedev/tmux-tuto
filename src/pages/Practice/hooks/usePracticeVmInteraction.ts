import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import type V86 from 'v86';
import type { V86Options } from 'v86';
import {
  parseTmuxActionsFromCommand,
  stripAnsi,
  type VmProbeMetric,
  type VmProbeStateSnapshot,
} from '../../../features/vm/missionBridge';
import { PROBE_TRIGGER_COMMAND } from '../probeCommands';
import { applyProbeMetricToVmMetrics, applyProbeStateSnapshotToVmMetrics, type VmMetricState, type VmMetricKey } from '../vmMetrics';
import type { useProgressStore } from '../../../features/progress/progressStore';
import type { VmBootConfig } from '../vmBoot';
import {
  PROBE_AUTO_MIN_INTERVAL_MS,
  captureProbeSchedulerState,
  consumePendingProbeReason,
  createProbeSchedulerState,
  markProbeSnapshotReceived,
  tryStartProbe,
  type ProbeTriggerReason,
} from '../probeScheduler';

type VmStatus = 'idle' | 'booting' | 'running' | 'stopped' | 'error';

type RegisterCommandOptions = {
  source?: 'shell' | 'shortcut';
  extraActions?: string[];
};

type UsePracticeVmInteractionArgs = {
  t: TFunction;
  autoProbe: boolean;
  setAutoProbe: Dispatch<SetStateAction<boolean>>;
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
  terminalInputBridgeRef: MutableRefObject<((data: string) => void) | null>;
  bootConfig: VmBootConfig;
};

type UsePracticeVmInteractionResult = {
  pushDebugLine: (line: string) => void;
  updateMetricByProbe: (metric: VmProbeMetric) => void;
  updateMetricsByProbeState: (snapshot: VmProbeStateSnapshot) => void;
  requestManualProbe: () => void;
  requestBootstrapProbe: () => void;
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

function extractSearchQuery(command: string) {
  const trimmed = command.trim();
  if (!trimmed) {
    return null;
  }

  const slashIndex = trimmed.lastIndexOf('/');
  if (slashIndex >= 0 && slashIndex < trimmed.length - 1) {
    const query = trimmed.slice(slashIndex + 1).trim();
    return query.length > 0 ? query : null;
  }

  const quoted = trimmed.match(/\bsearch-(?:forward|backward)\s+(?:"([^"]+)"|'([^']+)'|([^\s;]+))/i);
  if (!quoted) {
    return null;
  }

  const query = quoted[1] ?? quoted[2] ?? quoted[3] ?? '';
  const normalized = query.trim();
  return normalized.length > 0 ? normalized : null;
}

function outputContainsSearchQuery(debugLines: string[], query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return false;
  }

  return debugLines.some((line) => {
    const plainLine = stripAnsi(line).replace(/\r/g, '').trim();
    if (!plainLine) {
      return false;
    }

    if (/^[^#$\n]*[#$]\s+/.test(plainLine)) {
      return false;
    }

    if (plainLine.startsWith('/')) {
      return false;
    }

    return plainLine.includes(normalizedQuery);
  });
}

export function usePracticeVmInteraction({
  t,
  autoProbe,
  setAutoProbe,
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
  terminalInputBridgeRef,
  bootConfig,
}: UsePracticeVmInteractionArgs): UsePracticeVmInteractionResult {
  const postCommandProbeTimerRef = useRef<number | null>(null);
  const probeSchedulerRef = useRef(createProbeSchedulerState());
  const lastSearchMatchHintRef = useRef<boolean | null>(null);
  const debugLinesRef = useRef(debugLines);

  useEffect(() => {
    debugLinesRef.current = debugLines;
  }, [debugLines]);

  const recordTmuxSurfaceMetrics = useCallback(
    (nextMetrics: VmMetricState, changedMetricKeys: VmMetricKey[]) => {
      const includesPane = changedMetricKeys.includes('paneCount');
      const includesLayout = changedMetricKeys.includes('windowLayout');
      const includesZoomed = changedMetricKeys.includes('windowZoomed');
      const includesSync = changedMetricKeys.includes('paneSynchronized');
      if (!includesPane && !includesLayout && !includesZoomed && !includesSync) {
        return;
      }

      recordTmuxActivityRef.current({
        actions: [],
        paneCount: includesPane ? nextMetrics.paneCount : undefined,
        windowLayout: includesLayout ? nextMetrics.windowLayout : undefined,
        windowZoomed: includesZoomed ? nextMetrics.windowZoomed : undefined,
        paneSynchronized: includesSync ? nextMetrics.paneSynchronized : undefined,
        lessonSlug: selectedLessonSlugRef.current,
      });
    },
    [recordTmuxActivityRef, selectedLessonSlugRef],
  );

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

  const requestProbe = useCallback(
    (reason: ProbeTriggerReason, options?: { minIntervalMs?: number }) => {
      if (!emulatorRef.current || !vmInternalBridgeReadyRef.current) {
        return false;
      }

      const startResult = tryStartProbe(probeSchedulerRef.current, {
        reason,
        now: Date.now(),
        minIntervalMs: options?.minIntervalMs ?? 0,
      });
      if (!startResult.shouldDispatch) {
        return false;
      }

      sendInternalCommand(PROBE_TRIGGER_COMMAND);
      return true;
    },
    [emulatorRef, sendInternalCommand, vmInternalBridgeReadyRef],
  );

  const flushPendingProbe = useCallback(() => {
    const pendingReason = consumePendingProbeReason(probeSchedulerRef.current);
    if (!pendingReason) {
      return;
    }
    void requestProbe(pendingReason);
  }, [requestProbe]);

  const updateMetricByProbe = useCallback(
    (metric: VmProbeMetric) => {
      markProbeSnapshotReceived(probeSchedulerRef.current, Date.now());
      flushPendingProbe();
      setVmStatus('running');
      setVmStatusText(t('부팅 완료, 명령 입력 가능'));
      const currentUpdateResult = applyProbeMetricToVmMetrics(metricsRef.current, metric);

      setMetrics((previous) => applyProbeMetricToVmMetrics(previous, metric).nextMetrics);
      if (currentUpdateResult.changed && currentUpdateResult.metricKey) {
        triggerMetricVisualEffect(currentUpdateResult.metricKey);
      }

      if (currentUpdateResult.changed && currentUpdateResult.metricKey) {
        recordTmuxSurfaceMetrics(currentUpdateResult.nextMetrics, [currentUpdateResult.metricKey]);
      }
    },
    [
      flushPendingProbe,
      metricsRef,
      recordTmuxSurfaceMetrics,
      setMetrics,
      setVmStatus,
      setVmStatusText,
      t,
      triggerMetricVisualEffect,
    ],
  );

  const updateMetricsByProbeState = useCallback(
    (snapshot: VmProbeStateSnapshot) => {
      markProbeSnapshotReceived(probeSchedulerRef.current, Date.now());
      flushPendingProbe();
      setVmStatus('running');
      setVmStatusText(t('부팅 완료, 명령 입력 가능'));
      const applySnapshot = (previous: VmMetricState) => {
        const updateResult = applyProbeStateSnapshotToVmMetrics(previous, snapshot);
        if (snapshot.search === 0) {
          lastSearchMatchHintRef.current = null;
          return updateResult;
        }

        const hintedMatch = lastSearchMatchHintRef.current;
        if (snapshot.search === 1 && snapshot.searchMatched === 0 && hintedMatch !== null) {
          if (updateResult.nextMetrics.searchMatchFound === hintedMatch) {
            return updateResult;
          }

          const changedMetricKeys: VmMetricKey[] = updateResult.changedMetricKeys.includes('searchMatchFound')
            ? updateResult.changedMetricKeys
            : [...updateResult.changedMetricKeys, 'searchMatchFound'];

          return {
            nextMetrics: {
              ...updateResult.nextMetrics,
              searchMatchFound: hintedMatch,
            },
            changed: true,
            changedMetricKeys,
          };
        }

        return updateResult;
      };

      const currentUpdateResult = applySnapshot(metricsRef.current);
      setMetrics((previous) => applySnapshot(previous).nextMetrics);
      currentUpdateResult.changedMetricKeys.forEach((metricKey) => {
        triggerMetricVisualEffect(metricKey);
      });

      if (currentUpdateResult.changed) {
        recordTmuxSurfaceMetrics(currentUpdateResult.nextMetrics, currentUpdateResult.changedMetricKeys);
      }
    },
    [
      flushPendingProbe,
      metricsRef,
      recordTmuxSurfaceMetrics,
      setMetrics,
      setVmStatus,
      setVmStatusText,
      t,
      triggerMetricVisualEffect,
    ],
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
      void requestProbe('search');
    }, 140);
  }, [emulatorRef, requestProbe, searchProbeTimerRef, vmInternalBridgeReadyRef]);

  const scheduleProbeSoon = useCallback(() => {
    if (!emulatorRef.current || !vmInternalBridgeReadyRef.current) {
      return;
    }

    if (postCommandProbeTimerRef.current !== null) {
      window.clearTimeout(postCommandProbeTimerRef.current);
    }

    postCommandProbeTimerRef.current = window.setTimeout(() => {
      postCommandProbeTimerRef.current = null;
      void requestProbe('command');
    }, POST_COMMAND_PROBE_DELAY_MS);
  }, [emulatorRef, requestProbe, vmInternalBridgeReadyRef]);

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

      const searchQuery = extractSearchQuery(normalizedCommand);
      if (/(search-forward|search-backward|search -)/.test(lower) || /send-keys\s+.*-x\s+search/.test(lower) || searchQuery !== null) {
        const queryMatchHint = searchQuery ? outputContainsSearchQuery(debugLinesRef.current, searchQuery) : null;
        if (queryMatchHint !== null) {
          lastSearchMatchHintRef.current = queryMatchHint;
        }

        setMetrics((previous) => ({
          ...previous,
          searchExecuted: true,
          ...(queryMatchHint !== null ? { searchMatchFound: queryMatchHint } : {}),
        }));

        if (queryMatchHint === null) {
          requestSearchProbe();
        }
      }

      if (normalizedCommand.includes('tmux')) {
        scheduleProbeSoon();
      }
    },
    [
      recordTmuxActivityRef,
      requestSearchProbe,
      debugLinesRef,
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
        probeScheduler: captureProbeSchedulerState(probeSchedulerRef.current),
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
        void requestProbe('manual');
      },
      setAutoProbe: (enabled: boolean) => {
        setAutoProbe(Boolean(enabled));
      },
      sendCommand: (command: string) => {
        sendCommand(command);
      },
      sendInput: (data: string) => {
        const forwardInput = terminalInputBridgeRef.current;
        if (!forwardInput) {
          return;
        }
        forwardInput(data);
      },
      injectProbeMetric: (metric: VmProbeMetric) => {
        updateMetricByProbe(metric);
      },
      injectProbeState: (snapshot: VmProbeStateSnapshot) => {
        updateMetricsByProbeState(snapshot);
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
    requestProbe,
    setAutoProbe,
    sendCommand,
    sendInternalCommand,
    terminalInputBridgeRef,
    registerCommand,
    setActionHistory,
    updateMetricByProbe,
    updateMetricsByProbeState,
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

      void requestProbe('auto', { minIntervalMs: PROBE_AUTO_MIN_INTERVAL_MS });
    };

    triggerProbe();
    const timer = window.setInterval(triggerProbe, AUTO_PROBE_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [autoProbe, emulatorRef, requestProbe, vmInternalBridgeReadyRef, vmStatus]);

  const requestManualProbe = useCallback(() => {
    void requestProbe('manual');
  }, [requestProbe]);

  const requestBootstrapProbe = useCallback(() => {
    void requestProbe('bootstrap');
  }, [requestProbe]);

  useEffect(() => {
    if (vmStatus === 'running') {
      return;
    }

    probeSchedulerRef.current = createProbeSchedulerState();
  }, [vmStatus]);

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
    updateMetricsByProbeState,
    requestManualProbe,
    requestBootstrapProbe,
    sendInternalCommand,
    requestSearchProbe,
    registerCommand,
    sendCommand,
  };
}
