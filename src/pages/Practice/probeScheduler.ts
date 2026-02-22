export type ProbeTriggerReason = 'auto' | 'command' | 'search' | 'manual' | 'bootstrap' | 'pending';

export type ProbeSchedulerState = {
  inFlight: boolean;
  pending: boolean;
  pendingReason: ProbeTriggerReason | null;
  lastDispatchedAt: number | null;
  lastReceivedAt: number | null;
  dispatchSeq: number;
  ackSeq: number;
  skippedTicks: number;
  staleRecoveries: number;
  lastReason: ProbeTriggerReason | null;
};

export type TryStartProbeResult = {
  shouldDispatch: boolean;
  seq: number | null;
  recoveredStale: boolean;
};

export const PROBE_STALE_TIMEOUT_MS = 4_000;
export const PROBE_AUTO_MIN_INTERVAL_MS = 120;

export function createProbeSchedulerState(): ProbeSchedulerState {
  return {
    inFlight: false,
    pending: false,
    pendingReason: null,
    lastDispatchedAt: null,
    lastReceivedAt: null,
    dispatchSeq: 0,
    ackSeq: 0,
    skippedTicks: 0,
    staleRecoveries: 0,
    lastReason: null,
  };
}

type TryStartProbeOptions = {
  reason: ProbeTriggerReason;
  now: number;
  staleTimeoutMs?: number;
  minIntervalMs?: number;
};

export function tryStartProbe(
  state: ProbeSchedulerState,
  { reason, now, staleTimeoutMs = PROBE_STALE_TIMEOUT_MS, minIntervalMs = 0 }: TryStartProbeOptions,
): TryStartProbeResult {
  let recoveredStale = false;
  if (state.inFlight && state.lastDispatchedAt !== null && now - state.lastDispatchedAt > staleTimeoutMs) {
    state.inFlight = false;
    state.staleRecoveries += 1;
    recoveredStale = true;
  }

  const dispatchedRecently =
    minIntervalMs > 0 && state.lastDispatchedAt !== null && now - state.lastDispatchedAt < minIntervalMs;

  if (state.inFlight || dispatchedRecently) {
    state.pending = true;
    state.pendingReason = reason;
    state.skippedTicks += 1;
    return {
      shouldDispatch: false,
      seq: null,
      recoveredStale,
    };
  }

  state.dispatchSeq += 1;
  state.inFlight = true;
  state.lastDispatchedAt = now;
  state.lastReason = reason;
  state.pending = false;
  state.pendingReason = null;
  return {
    shouldDispatch: true,
    seq: state.dispatchSeq,
    recoveredStale,
  };
}

export function markProbeSnapshotReceived(state: ProbeSchedulerState, now: number) {
  state.lastReceivedAt = now;
  if (state.inFlight) {
    state.inFlight = false;
    state.ackSeq = state.dispatchSeq;
  }
}

export function consumePendingProbeReason(state: ProbeSchedulerState): ProbeTriggerReason | null {
  if (!state.pending) {
    return null;
  }

  const pendingReason = state.pendingReason ?? 'pending';
  state.pending = false;
  state.pendingReason = null;
  return pendingReason;
}

export function captureProbeSchedulerState(state: ProbeSchedulerState): ProbeSchedulerState {
  return {
    ...state,
  };
}
