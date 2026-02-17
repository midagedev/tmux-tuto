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
      },
    };
    const actions = resolveSimulatorInput(state, 'n');

    expect(actions).toEqual([{ type: 'SET_COMMAND_BUFFER', payload: 'n' }]);
  });
});
