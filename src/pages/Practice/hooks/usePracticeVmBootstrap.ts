import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import type V86 from 'v86';
import type { V86Options } from 'v86';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { parseProbeStateFromLine, stripAnsi, type VmProbeStateSnapshot } from '../../../features/vm/missionBridge';
import {
  createTmuxShortcutTelemetryState,
  parseTmuxShortcutTelemetry,
} from '../../../features/vm/tmuxShortcutTelemetry';
import { createInitialMetrics, type VmMetricState } from '../vmMetrics';
import {
  BANNER_TRIGGER_COMMAND,
  createVmBaseOptions,
  DEFAULT_TERMINAL_COLS,
  DEFAULT_TERMINAL_ROWS,
  loadVmInitialState,
  type VmBootConfig,
} from '../vmBoot';
import { consumeProbeOutputByte, consumeTerminalInputData, consumeTerminalOutputByte } from '../vmTerminalStream';

type VmStatus = 'idle' | 'booting' | 'running' | 'stopped' | 'error';

type UsePracticeVmBootstrapArgs = {
  t: TFunction;
  contentReady: boolean;
  vmEpoch: number;
  disableWarmStart: boolean;
  terminalHostRef: MutableRefObject<HTMLDivElement | null>;
  terminalRef: MutableRefObject<Terminal | null>;
  emulatorRef: MutableRefObject<V86 | null>;
  lastEmulatorOptionsRef: MutableRefObject<V86Options | null>;
  vmInternalBridgeReadyRef: MutableRefObject<boolean>;
  vmWarmBannerPendingRef: MutableRefObject<boolean>;
  searchProbeTimerRef: MutableRefObject<number | null>;
  metricsRef: MutableRefObject<VmMetricState>;
  setVmStatus: Dispatch<SetStateAction<VmStatus>>;
  setVmStatusText: Dispatch<SetStateAction<string>>;
  setMetrics: Dispatch<SetStateAction<VmMetricState>>;
  setActionHistory: Dispatch<SetStateAction<string[]>>;
  setCommandHistory: Dispatch<SetStateAction<string[]>>;
  setDebugLines: Dispatch<SetStateAction<string[]>>;
  clearMetricVisualEffects: () => void;
  clearMetricVisualState: () => void;
  pushDebugLine: (line: string) => void;
  updateMetricsByProbeState: (snapshot: VmProbeStateSnapshot) => void;
  registerCommand: (
    command: string,
    options?: {
      source?: 'shell' | 'shortcut';
      extraActions?: string[];
    },
  ) => void;
  requestBootstrapProbe: () => void;
  requestSearchProbe: () => void;
  sendInternalCommand: (command: string) => void;
  terminalGeometrySyncCommand: string;
  bootConfig: VmBootConfig;
};

export function usePracticeVmBootstrap({
  t,
  contentReady,
  vmEpoch,
  disableWarmStart,
  terminalHostRef,
  terminalRef,
  emulatorRef,
  lastEmulatorOptionsRef,
  vmInternalBridgeReadyRef,
  vmWarmBannerPendingRef,
  searchProbeTimerRef,
  metricsRef,
  setVmStatus,
  setVmStatusText,
  setMetrics,
  setActionHistory,
  setCommandHistory,
  setDebugLines,
  clearMetricVisualEffects,
  clearMetricVisualState,
  pushDebugLine,
  updateMetricsByProbeState,
  registerCommand,
  requestBootstrapProbe,
  requestSearchProbe,
  sendInternalCommand,
  terminalGeometrySyncCommand,
  bootConfig,
}: UsePracticeVmBootstrapArgs) {
  const inputLineBufferRef = useRef('');
  const inputEscapeSequenceRef = useRef(false);
  const outputEscapeSequenceRef = useRef(false);
  const lineBufferRef = useRef('');
  const probeLineBufferRef = useRef('');
  const shortcutTelemetryStateRef = useRef(createTmuxShortcutTelemetryState());

  useEffect(() => {
    if (!contentReady) {
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
    clearMetricVisualState();
    metricsRef.current = initialMetrics;
    setActionHistory([]);
    setCommandHistory([]);
    setDebugLines([]);
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
      const inputCaptureResult = consumeTerminalInputData(data, {
        lineBuffer: inputLineBufferRef.current,
        inEscapeSequence: inputEscapeSequenceRef.current,
      });
      inputLineBufferRef.current = inputCaptureResult.nextState.lineBuffer;
      inputEscapeSequenceRef.current = inputCaptureResult.nextState.inEscapeSequence;
      inputCaptureResult.commands.forEach((command) => {
        registerCommand(command, { source: 'shell' });
      });
      emulatorRef.current.serial0_send(data);
    });

    const writeByte = (value: number) => {
      terminal.write(Uint8Array.of(value & 0xff));
      const outputCaptureResult = consumeTerminalOutputByte(value, {
        lineBuffer: lineBufferRef.current,
        inEscapeSequence: outputEscapeSequenceRef.current,
      });
      lineBufferRef.current = outputCaptureResult.nextState.lineBuffer;
      outputEscapeSequenceRef.current = outputCaptureResult.nextState.inEscapeSequence;

      if (outputCaptureResult.completedLine === null) {
        return;
      }

      const completedLine = outputCaptureResult.completedLine;
      const probeState = parseProbeStateFromLine(completedLine);
      if (probeState) {
        updateMetricsByProbeState(probeState);
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
        sendInternalCommand(terminalGeometrySyncCommand);
        requestBootstrapProbe();
      }
    };

    const writeProbeByte = (value: number) => {
      const probeCaptureResult = consumeProbeOutputByte(value, probeLineBufferRef.current);
      probeLineBufferRef.current = probeCaptureResult.nextLineBuffer;
      if (probeCaptureResult.completedLine === null) {
        return;
      }
      const probeState = parseProbeStateFromLine(probeCaptureResult.completedLine);
      if (probeState) {
        updateMetricsByProbeState(probeState);
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

        const initialState = disableWarmStart ? null : await loadVmInitialState(bootConfig.initialStatePath);
        if (!isMounted) {
          return;
        }

        let useWarmStart = Boolean(initialState);
        if (useWarmStart) {
          setVmStatusText(t('빠른 시작 스냅샷 로딩 중...'));
        }

        const baseOptions = createVmBaseOptions(bootConfig);

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
              sendInternalCommand(terminalGeometrySyncCommand);
              requestBootstrapProbe();
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
      clearMetricVisualEffects();

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
    bootConfig,
    clearMetricVisualEffects,
    clearMetricVisualState,
    contentReady,
    disableWarmStart,
    emulatorRef,
    inputEscapeSequenceRef,
    inputLineBufferRef,
    lastEmulatorOptionsRef,
    lineBufferRef,
    metricsRef,
    outputEscapeSequenceRef,
    probeLineBufferRef,
    pushDebugLine,
    requestBootstrapProbe,
    registerCommand,
    requestSearchProbe,
    searchProbeTimerRef,
    sendInternalCommand,
    setActionHistory,
    setCommandHistory,
    setDebugLines,
    setMetrics,
    setVmStatus,
    setVmStatusText,
    t,
    terminalGeometrySyncCommand,
    terminalHostRef,
    terminalRef,
    updateMetricsByProbeState,
    vmEpoch,
    vmInternalBridgeReadyRef,
    vmWarmBannerPendingRef,
  ]);
}
