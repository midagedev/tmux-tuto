import { describe, expect, it } from 'vitest';
import { createInitialSimulatorState } from './model';
import { normalizeKeyboardEvent, resolveSimulatorInput, resolveSimulatorInputAt } from './input';

describe('resolveSimulatorInput', () => {
  it('enters PREFIX_PENDING when prefix key is pressed', () => {
    const state = createInitialSimulatorState();
    const actions = resolveSimulatorInputAt(state, 'C-b', 1000);

    expect(actions).toEqual([{ type: 'ENTER_PREFIX_PENDING', payload: { at: 1000 } }]);
  });

  it('supports configurable prefix key for entering PREFIX_PENDING', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      tmux: {
        ...initial.tmux,
        config: {
          ...initial.tmux.config,
          prefixKey: 'C-a' as const,
        },
      },
    };

    expect(resolveSimulatorInputAt(state, 'C-b', 1000)).toEqual([{ type: 'RECORD_ACTION', payload: 'sim.key.raw.C-b' }]);
    expect(resolveSimulatorInputAt(state, 'C-a', 1000)).toEqual([{ type: 'ENTER_PREFIX_PENDING', payload: { at: 1000 } }]);
  });

  it('maps prefix + % to split action and mode reset', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      mode: {
        ...initial.mode,
        value: 'PREFIX_PENDING' as const,
      },
    };
    const actions = resolveSimulatorInput(state, '%');

    expect(actions).toEqual([
      { type: 'SPLIT_PANE', payload: 'vertical' },
      { type: 'SET_MODE', payload: 'NORMAL' },
      { type: 'SET_REPEAT_WINDOW', payload: null },
    ]);
  });

  it('uses custom bind command when prefix key table is overridden', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      tmux: {
        ...initial.tmux,
        config: {
          ...initial.tmux.config,
          binds: { x: 'split-window -h' },
        },
      },
      mode: {
        ...initial.mode,
        value: 'PREFIX_PENDING' as const,
      },
    };
    const actions = resolveSimulatorInput(state, 'x');

    expect(actions).toEqual([
      { type: 'EXECUTE_COMMAND', payload: 'split-window -h' },
      { type: 'SET_MODE', payload: 'NORMAL' },
      { type: 'SET_REPEAT_WINDOW', payload: null },
    ]);
  });

  it('builds command buffer in command mode', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      mode: {
        ...initial.mode,
        value: 'COMMAND_MODE' as const,
        commandBuffer: '',
        commandCursor: 0,
      },
    };
    const actions = resolveSimulatorInput(state, 'n');

    expect(actions).toEqual([{ type: 'SET_COMMAND_LINE', payload: { buffer: 'n', cursor: 1 } }]);
  });

  it('routes ArrowUp to command history navigation in command mode', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      mode: {
        ...initial.mode,
        value: 'COMMAND_MODE' as const,
      },
    };
    const actions = resolveSimulatorInput(state, 'ArrowUp');

    expect(actions).toEqual([{ type: 'NAVIGATE_COMMAND_HISTORY', payload: 'up' }]);
  });

  it('supports repeat table movement without pressing prefix repeatedly', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      mode: {
        ...initial.mode,
        repeatUntil: 2000,
      },
    };
    const actions = resolveSimulatorInputAt(state, 'h', 1500);

    expect(actions).toEqual([
      { type: 'FOCUS_PANE', payload: 'left' },
      { type: 'SET_REPEAT_WINDOW', payload: 2400 },
    ]);
  });

  it('falls back to normal input when prefix timeout is exceeded', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      mode: {
        ...initial.mode,
        value: 'PREFIX_PENDING' as const,
        prefixEnteredAt: 0,
      },
    };
    const actions = resolveSimulatorInputAt(state, '%', 2000);

    expect(actions).toEqual([
      { type: 'SET_MODE', payload: 'NORMAL' },
      { type: 'SET_REPEAT_WINDOW', payload: null },
      { type: 'RECORD_ACTION', payload: 'sim.key.raw.%' },
    ]);
  });

  it('navigates copy-mode matches with n/N keys', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      mode: {
        ...initial.mode,
        value: 'COPY_MODE' as const,
      },
    };

    expect(resolveSimulatorInput(state, 'n')).toEqual([{ type: 'ADVANCE_COPY_MATCH', payload: 1 }]);
    expect(resolveSimulatorInput(state, 'N')).toEqual([{ type: 'ADVANCE_COPY_MATCH', payload: -1 }]);
  });

  it('records unmapped prefix key and clears repeat window', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      mode: {
        ...initial.mode,
        value: 'PREFIX_PENDING' as const,
      },
    };

    expect(resolveSimulatorInput(state, 'x')).toEqual([
      { type: 'ADD_MESSAGE', payload: 'Unmapped prefix key: x' },
      { type: 'RECORD_ACTION', payload: 'sim.key.unmapped' },
      { type: 'SET_MODE', payload: 'NORMAL' },
      { type: 'SET_REPEAT_WINDOW', payload: null },
    ]);
  });

  it('clears command buffer and exits command mode on Escape', () => {
    const initial = createInitialSimulatorState();
    const state = {
      ...initial,
      mode: {
        ...initial.mode,
        value: 'COMMAND_MODE' as const,
        commandBuffer: 'split-window -h',
        commandCursor: 15,
      },
    };

    expect(resolveSimulatorInput(state, 'Escape')).toEqual([
      { type: 'CLEAR_COMMAND_BUFFER' },
      { type: 'SET_MODE', payload: 'NORMAL' },
    ]);
  });

  it('runs copy-mode search using existing query on / key', () => {
    const initial = createInitialSimulatorState();
    const stateWithQuery = {
      ...initial,
      mode: {
        ...initial.mode,
        value: 'COPY_MODE' as const,
        copyMode: {
          ...initial.mode.copyMode,
          searchQuery: 'warn',
        },
      },
    };
    const stateWithoutQuery = {
      ...stateWithQuery,
      mode: {
        ...stateWithQuery.mode,
        copyMode: {
          ...stateWithQuery.mode.copyMode,
          searchQuery: '',
        },
      },
    };

    expect(resolveSimulatorInput(stateWithQuery, '/')).toEqual([{ type: 'RUN_COPY_SEARCH', payload: 'warn' }]);
    expect(resolveSimulatorInput(stateWithoutQuery, '/')).toEqual([{ type: 'RUN_COPY_SEARCH', payload: 'error' }]);
  });
});

describe('normalizeKeyboardEvent', () => {
  it('normalizes supported ctrl keys into tmux style names', () => {
    const ctrlB = { ctrlKey: true, key: 'b' } as KeyboardEvent;
    const ctrlA = { ctrlKey: true, key: 'a' } as KeyboardEvent;
    const ctrlE = { ctrlKey: true, key: 'e' } as KeyboardEvent;
    const ctrlU = { ctrlKey: true, key: 'u' } as KeyboardEvent;
    const ctrlK = { ctrlKey: true, key: 'k' } as KeyboardEvent;

    expect(normalizeKeyboardEvent(ctrlB)).toBe('C-b');
    expect(normalizeKeyboardEvent(ctrlA)).toBe('C-a');
    expect(normalizeKeyboardEvent(ctrlE)).toBe('C-e');
    expect(normalizeKeyboardEvent(ctrlU)).toBe('C-u');
    expect(normalizeKeyboardEvent(ctrlK)).toBe('C-k');
  });

  it('passes through named keys and printable characters', () => {
    const enter = { ctrlKey: false, key: 'Enter' } as KeyboardEvent;
    const escape = { ctrlKey: false, key: 'Escape' } as KeyboardEvent;
    const printable = { ctrlKey: false, key: '%' } as KeyboardEvent;
    const named = { ctrlKey: false, key: 'ArrowDown' } as KeyboardEvent;

    expect(normalizeKeyboardEvent(enter)).toBe('Enter');
    expect(normalizeKeyboardEvent(escape)).toBe('Escape');
    expect(normalizeKeyboardEvent(printable)).toBe('%');
    expect(normalizeKeyboardEvent(named)).toBe('ArrowDown');
  });
});
