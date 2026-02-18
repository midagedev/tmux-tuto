import { describe, expect, it } from 'vitest';
import { CHEATSHEET_ITEMS } from '../cheatsheet/items';
import { createInitialSimulatorState } from './model';
import { QUICK_PRESETS, resolveQuickPreset } from './quickPresets';
import { simulatorReducer } from './reducer';

describe('quickPresets', () => {
  it('maps every cheatsheet item id to a quick preset', () => {
    const presetIds = new Set(Object.keys(QUICK_PRESETS));

    CHEATSHEET_ITEMS.forEach((item) => {
      expect(presetIds.has(item.id)).toBe(true);
      expect(resolveQuickPreset(item.id)?.actions.length).toBeGreaterThan(0);
    });
  });

  it('applies recommended-config preset to tmux config state', () => {
    const preset = resolveQuickPreset('cs-recommended-config');
    expect(preset).toBeTruthy();

    const state = (preset?.actions ?? []).reduce(simulatorReducer, createInitialSimulatorState());

    expect(state.tmux.config.prefixKey).toBe('C-a');
    expect(state.tmux.config.modeKeys).toBe('vi');
    expect(state.tmux.config.lastAppliedSource).toBe('/home/user/.tmux.conf');
  });
});
