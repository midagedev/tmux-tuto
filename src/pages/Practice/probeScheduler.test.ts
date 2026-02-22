import { describe, expect, it } from 'vitest';
import {
  captureProbeSchedulerState,
  consumePendingProbeReason,
  createProbeSchedulerState,
  markProbeSnapshotReceived,
  tryStartProbe,
} from './probeScheduler';

describe('probeScheduler', () => {
  it('blocks overlapping probes and queues a pending reason', () => {
    const state = createProbeSchedulerState();

    const firstStart = tryStartProbe(state, { reason: 'auto', now: 1_000 });
    expect(firstStart.shouldDispatch).toBe(true);
    expect(firstStart.seq).toBe(1);
    expect(state.inFlight).toBe(true);

    const secondStart = tryStartProbe(state, { reason: 'command', now: 1_050 });
    expect(secondStart.shouldDispatch).toBe(false);
    expect(state.pending).toBe(true);
    expect(state.pendingReason).toBe('command');
    expect(state.skippedTicks).toBe(1);

    markProbeSnapshotReceived(state, 1_120);
    expect(state.inFlight).toBe(false);
    expect(state.ackSeq).toBe(1);

    expect(consumePendingProbeReason(state)).toBe('command');
    expect(consumePendingProbeReason(state)).toBeNull();
  });

  it('recovers stale in-flight probes and resumes dispatch', () => {
    const state = createProbeSchedulerState();

    expect(tryStartProbe(state, { reason: 'auto', now: 1_000 }).shouldDispatch).toBe(true);

    const recoveredStart = tryStartProbe(state, {
      reason: 'auto',
      now: 2_400,
      staleTimeoutMs: 800,
    });
    expect(recoveredStart.shouldDispatch).toBe(true);
    expect(recoveredStart.recoveredStale).toBe(true);
    expect(state.dispatchSeq).toBe(2);
    expect(state.staleRecoveries).toBe(1);
  });

  it('throttles rapid auto probes with min interval and dispatches once window opens', () => {
    const state = createProbeSchedulerState();

    expect(tryStartProbe(state, { reason: 'auto', now: 1_000 }).shouldDispatch).toBe(true);
    markProbeSnapshotReceived(state, 1_010);

    const throttled = tryStartProbe(state, {
      reason: 'auto',
      now: 1_050,
      minIntervalMs: 120,
    });
    expect(throttled.shouldDispatch).toBe(false);
    expect(state.pending).toBe(true);

    const pendingReason = consumePendingProbeReason(state);
    expect(pendingReason).toBe('auto');
    expect(
      tryStartProbe(state, {
        reason: pendingReason ?? 'pending',
        now: 1_150,
        minIntervalMs: 120,
      }).shouldDispatch,
    ).toBe(true);
    expect(state.dispatchSeq).toBe(2);
  });

  it('captures scheduler debug snapshot without mutating source state', () => {
    const state = createProbeSchedulerState();
    tryStartProbe(state, { reason: 'manual', now: 3_000 });
    const captured = captureProbeSchedulerState(state);
    captured.dispatchSeq = 99;
    expect(state.dispatchSeq).toBe(1);
  });
});
