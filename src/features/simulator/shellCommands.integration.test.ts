import { describe, expect, it } from 'vitest';
import { createInitialSimulatorState, getActivePane, getActiveWindow } from './model';
import { simulatorReducer } from './reducer';

describe('shell command integration', () => {
  it('executes file/path pseudo commands and appends output to pane buffer', () => {
    let state = createInitialSimulatorState();
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'pwd' });
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'mkdir notes' });
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'touch notes/todo.txt' });
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'echo hello > notes/todo.txt' });
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'cat notes/todo.txt' });
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'history' });

    const pane = getActivePane(state);

    expect(pane.buffer).toContain('/home/user');
    expect(pane.buffer).toContain('hello');
    expect(pane.buffer.some((line) => line.includes('1  pwd'))).toBe(true);
    expect(state.shell.sessions[0]?.history).toContain('cat notes/todo.txt');
  });

  it('supports grep/tail/clear command behavior', () => {
    let state = createInitialSimulatorState();
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'grep error logs/app.log' });
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'tail -n 2 logs/app.log' });

    const beforeClear = getActivePane(state);
    expect(beforeClear.buffer).toContain('error sample line');
    expect(beforeClear.buffer).toContain('worker ready');

    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'clear' });
    const afterClear = getActivePane(state);
    expect(afterClear.buffer).toEqual([]);
  });

  it('bridges tmux subcommands through tmux prefix command', () => {
    const initial = createInitialSimulatorState();
    const next = simulatorReducer(initial, { type: 'EXECUTE_COMMAND', payload: 'tmux split-window -h' });

    expect(getActiveWindow(next).panes.length).toBe(2);
  });
});
