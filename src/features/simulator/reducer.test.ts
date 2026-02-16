import { describe, expect, it } from 'vitest';
import { createInitialSimulatorState, getActiveWindow } from './model';
import { simulatorReducer } from './reducer';

describe('simulatorReducer', () => {
  it('splits pane vertically and updates pane count', () => {
    const initial = createInitialSimulatorState();
    const next = simulatorReducer(initial, { type: 'SPLIT_PANE', payload: 'vertical' });

    expect(getActiveWindow(next).panes.length).toBe(2);
    expect(next.actionHistory[next.actionHistory.length - 1]).toBe('sim.pane.split.vertical');
  });

  it('executes split-window command in command mode subset', () => {
    const initial = createInitialSimulatorState();
    const next = simulatorReducer(initial, { type: 'EXECUTE_COMMAND', payload: 'split-window -h' });

    expect(getActiveWindow(next).panes.length).toBe(2);
  });

  it('keeps at least one pane when kill-pane is requested repeatedly', () => {
    const initial = createInitialSimulatorState();
    const onceSplit = simulatorReducer(initial, { type: 'SPLIT_PANE', payload: 'horizontal' });
    const killed = simulatorReducer(onceSplit, { type: 'KILL_ACTIVE_PANE' });
    const killedAgain = simulatorReducer(killed, { type: 'KILL_ACTIVE_PANE' });

    expect(getActiveWindow(killed).panes.length).toBe(1);
    expect(getActiveWindow(killedAgain).panes.length).toBe(1);
  });
});
