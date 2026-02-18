import { describe, expect, it } from 'vitest';
import { createInitialSimulatorState, getActiveWindow } from './model';
import { simulatorReducer } from './reducer';

describe('simulatorReducer', () => {
  it('splits pane vertically and updates pane count', () => {
    const initial = createInitialSimulatorState();
    const next = simulatorReducer(initial, { type: 'SPLIT_PANE', payload: 'vertical' });

    expect(getActiveWindow(next).panes.length).toBe(2);
    expect(getActiveWindow(next).layout).toBe('vertical');
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

  it('switches to grid layout when pane count grows beyond 2', () => {
    const initial = createInitialSimulatorState();
    const splitVertical = simulatorReducer(initial, { type: 'SPLIT_PANE', payload: 'vertical' });
    const splitHorizontal = simulatorReducer(splitVertical, { type: 'SPLIT_PANE', payload: 'horizontal' });
    const activeWindow = getActiveWindow(splitHorizontal);

    expect(activeWindow.layout).toBe('grid');
    expect(activeWindow.panes.length).toBe(3);
    expect(activeWindow.panes.every((pane) => pane.width >= 10 && pane.height >= 5)).toBe(true);
  });

  it('moves focus by directional geometry', () => {
    const initial = createInitialSimulatorState();
    const withTwoPanes = simulatorReducer(initial, { type: 'SPLIT_PANE', payload: 'vertical' });
    const activeWindow = getActiveWindow(withTwoPanes);
    const activePaneBefore = activeWindow.activePaneId;

    const focusedLeft = simulatorReducer(withTwoPanes, { type: 'FOCUS_PANE', payload: 'left' });
    const activePaneAfter = getActiveWindow(focusedLeft).activePaneId;

    expect(activePaneAfter).not.toBe(activePaneBefore);
  });

  it('supports click focus and pane-level scroll state updates', () => {
    const initial = createInitialSimulatorState();
    const withTwoPanes = simulatorReducer(initial, { type: 'SPLIT_PANE', payload: 'vertical' });
    const secondPaneId = getActiveWindow(withTwoPanes).panes[1]?.id ?? '';
    const focused = simulatorReducer(withTwoPanes, { type: 'SET_ACTIVE_PANE', payload: secondPaneId });
    let scrolled = focused;

    for (let index = 0; index < 3; index += 1) {
      scrolled = simulatorReducer(scrolled, { type: 'EXECUTE_COMMAND', payload: 'cat logs/app.log' });
    }

    const before = getActiveWindow(scrolled).panes.find((pane) => pane.id === secondPaneId)?.terminal.viewportTop ?? 0;
    const afterScroll = simulatorReducer(scrolled, {
      type: 'SCROLL_PANE',
      payload: { paneId: secondPaneId, delta: 2 },
    });
    const after = getActiveWindow(afterScroll).panes.find((pane) => pane.id === secondPaneId)?.terminal.viewportTop ?? 0;

    expect(getActiveWindow(focused).activePaneId).toBe(secondPaneId);
    expect(after).toBeLessThan(before);
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
