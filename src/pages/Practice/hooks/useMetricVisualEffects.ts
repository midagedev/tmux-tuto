import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createInitialMetricHighlightState,
  VM_METRIC_KEYS,
  type VmMetricHighlightState,
  type VmMetricKey,
} from '../vmMetrics';

const METRIC_HIGHLIGHT_DURATION_MS = 680;
const TERMINAL_FLASH_DURATION_MS = 340;

export function useMetricVisualEffects() {
  const [metricHighlightState, setMetricHighlightState] = useState<VmMetricHighlightState>(
    createInitialMetricHighlightState,
  );
  const [isTerminalFlashActive, setIsTerminalFlashActive] = useState(false);
  const metricHighlightTimersRef = useRef<Partial<Record<VmMetricKey, number>>>({});
  const terminalFlashTimerRef = useRef<number | null>(null);
  const terminalFlashRafRef = useRef<number | null>(null);

  const clearMetricVisualTimers = useCallback(() => {
    VM_METRIC_KEYS.forEach((metricKey) => {
      const timerId = metricHighlightTimersRef.current[metricKey];
      if (timerId === undefined) {
        return;
      }
      window.clearTimeout(timerId);
      delete metricHighlightTimersRef.current[metricKey];
    });

    if (terminalFlashTimerRef.current !== null) {
      window.clearTimeout(terminalFlashTimerRef.current);
      terminalFlashTimerRef.current = null;
    }

    if (terminalFlashRafRef.current !== null) {
      window.cancelAnimationFrame(terminalFlashRafRef.current);
      terminalFlashRafRef.current = null;
    }
  }, []);

  const clearMetricVisualEffects = useCallback(() => {
    clearMetricVisualTimers();
    setIsTerminalFlashActive(false);
  }, [clearMetricVisualTimers]);

  const clearMetricVisualState = useCallback(() => {
    clearMetricVisualEffects();
    setMetricHighlightState(createInitialMetricHighlightState());
  }, [clearMetricVisualEffects]);

  const triggerMetricVisualEffect = useCallback((metricKey: VmMetricKey | null) => {
    if (!metricKey) {
      return;
    }

    setMetricHighlightState((previous) => ({
      ...previous,
      [metricKey]: true,
    }));

    const existingTimer = metricHighlightTimersRef.current[metricKey];
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }
    metricHighlightTimersRef.current[metricKey] = window.setTimeout(() => {
      setMetricHighlightState((previous) => {
        if (!previous[metricKey]) {
          return previous;
        }
        return {
          ...previous,
          [metricKey]: false,
        };
      });
      delete metricHighlightTimersRef.current[metricKey];
    }, METRIC_HIGHLIGHT_DURATION_MS);

    setIsTerminalFlashActive(false);
    terminalFlashRafRef.current = window.requestAnimationFrame(() => {
      setIsTerminalFlashActive(true);
      terminalFlashRafRef.current = null;
    });

    if (terminalFlashTimerRef.current !== null) {
      window.clearTimeout(terminalFlashTimerRef.current);
    }
    terminalFlashTimerRef.current = window.setTimeout(() => {
      setIsTerminalFlashActive(false);
      terminalFlashTimerRef.current = null;
    }, TERMINAL_FLASH_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      clearMetricVisualEffects();
    };
  }, [clearMetricVisualEffects]);

  return {
    metricHighlightState,
    isTerminalFlashActive,
    triggerMetricVisualEffect,
    clearMetricVisualEffects,
    clearMetricVisualState,
  };
}
