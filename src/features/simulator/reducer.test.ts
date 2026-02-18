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

  it('stores executed commands in shell history', () => {
    const initial = createInitialSimulatorState();
    const afterFirst = simulatorReducer(initial, { type: 'EXECUTE_COMMAND', payload: 'new-window' });
    const afterSecond = simulatorReducer(afterFirst, { type: 'EXECUTE_COMMAND', payload: 'next-window' });

    expect(afterSecond.shell.sessions[0]?.history).toEqual(['new-window', 'next-window']);
  });

  it('navigates command history with up/down actions', () => {
    const initial = createInitialSimulatorState();
    const withHistory = [
      { type: 'EXECUTE_COMMAND', payload: 'new-window' } as const,
      { type: 'EXECUTE_COMMAND', payload: 'split-window -h' } as const,
      { type: 'SET_MODE', payload: 'COMMAND_MODE' } as const,
      { type: 'SET_COMMAND_LINE', payload: { buffer: '', cursor: 0 } } as const,
    ].reduce(simulatorReducer, initial);

    const upOnce = simulatorReducer(withHistory, { type: 'NAVIGATE_COMMAND_HISTORY', payload: 'up' });
    const upTwice = simulatorReducer(upOnce, { type: 'NAVIGATE_COMMAND_HISTORY', payload: 'up' });
    const downOnce = simulatorReducer(upTwice, { type: 'NAVIGATE_COMMAND_HISTORY', payload: 'down' });
    const downTwice = simulatorReducer(downOnce, { type: 'NAVIGATE_COMMAND_HISTORY', payload: 'down' });

    expect(upOnce.mode.commandBuffer).toBe('split-window -h');
    expect(upTwice.mode.commandBuffer).toBe('new-window');
    expect(downOnce.mode.commandBuffer).toBe('split-window -h');
    expect(downTwice.mode.commandBuffer).toBe('');
  });

  it('initializes scenario template state by preset id', () => {
    const initial = createInitialSimulatorState();
    const next = simulatorReducer(initial, { type: 'INIT_SCENARIO', payload: 'log-buffer' });

    expect(next.scenarioPresetId).toBe('log-buffer');
    expect(next.shell.sessions[0]?.workingDirectory).toBe('/home/user/logs');
    expect(next.shell.sessions[0]?.fileSystem.files['/home/user/logs/app.log']).toContain('ERROR');
    expect(getActiveWindow(next).panes[0]?.buffer.some((line) => line.includes('ERROR'))).toBe(true);
  });
});
