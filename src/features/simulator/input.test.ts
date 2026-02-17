import { describe, expect, it } from 'vitest';
import { createInitialSimulatorState } from './model';
import { resolveSimulatorInput } from './input';

describe('resolveSimulatorInput', () => {
  it('enters PREFIX_PENDING when prefix key is pressed', () => {
    const state = createInitialSimulatorState();
    const actions = resolveSimulatorInput(state, 'C-b');

    expect(actions).toEqual([{ type: 'SET_MODE', payload: 'PREFIX_PENDING' }]);
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
});
