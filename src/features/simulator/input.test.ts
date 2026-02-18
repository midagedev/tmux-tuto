import { describe, expect, it } from 'vitest';
import { createInitialSimulatorState } from './model';
import { resolveSimulatorInput, resolveSimulatorInputAt } from './input';

describe('resolveSimulatorInput', () => {
  it('enters PREFIX_PENDING when prefix key is pressed', () => {
    const state = createInitialSimulatorState();
    const actions = resolveSimulatorInputAt(state, 'C-b', 1000);

    expect(actions).toEqual([{ type: 'ENTER_PREFIX_PENDING', payload: { at: 1000 } }]);
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
});
