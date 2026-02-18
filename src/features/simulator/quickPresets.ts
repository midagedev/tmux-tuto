import type { SimulatorAction } from './reducer';

export type QuickPresetDefinition = {
  id: string;
  description: string;
  actions: SimulatorAction[];
};

const RECOMMENDED_CONFIG = [
  'set -g prefix C-a',
  'set -g mouse on',
  'setw -g mode-keys vi',
  'bind r source-file ~/.tmux.conf',
].join('\n');

export const QUICK_PRESETS: Record<string, QuickPresetDefinition> = {
  'cs-split-vertical': {
    id: 'cs-split-vertical',
    description: 'Split pane vertically',
    actions: [{ type: 'SPLIT_PANE', payload: 'vertical' }],
  },
  'cs-split-horizontal': {
    id: 'cs-split-horizontal',
    description: 'Split pane horizontally',
    actions: [{ type: 'SPLIT_PANE', payload: 'horizontal' }],
  },
  'cs-window-new': {
    id: 'cs-window-new',
    description: 'Create a new tmux window',
    actions: [{ type: 'NEW_WINDOW' }],
  },
  'cs-window-next': {
    id: 'cs-window-next',
    description: 'Create and move to next window',
    actions: [{ type: 'NEW_WINDOW' }, { type: 'NEXT_WINDOW' }],
  },
  'cs-copy-mode': {
    id: 'cs-copy-mode',
    description: 'Enter copy-mode',
    actions: [{ type: 'ENTER_COPY_MODE' }],
  },
  'cs-command-mode': {
    id: 'cs-command-mode',
    description: 'Enter command-mode',
    actions: [{ type: 'SET_MODE', payload: 'COMMAND_MODE' }, { type: 'CLEAR_COMMAND_BUFFER' }],
  },
  'cs-session-main': {
    id: 'cs-session-main',
    description: 'Simulate tmux new -As main',
    actions: [{ type: 'NEW_SESSION' }, { type: 'ADD_MESSAGE', payload: 'Practice preset: tmux new -As main' }],
  },
  'cs-recommended-config': {
    id: 'cs-recommended-config',
    description: 'Apply recommended tmux.conf subset',
    actions: [
      {
        type: 'APPLY_TMUX_CONFIG',
        payload: {
          content: RECOMMENDED_CONFIG,
          sourcePath: '/home/user/.tmux.conf',
        },
      },
    ],
  },
  'cs-session-persistence': {
    id: 'cs-session-persistence',
    description: 'Simulate detach/attach session workflow',
    actions: [
      { type: 'NEW_SESSION' },
      { type: 'NEW_WINDOW' },
      { type: 'NEXT_WINDOW' },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: session persistence workflow simulated' },
    ],
  },
  'cs-tailscale-ssh': {
    id: 'cs-tailscale-ssh',
    description: 'Simulate Tailscale SSH remote workflow',
    actions: [
      { type: 'EXECUTE_COMMAND', payload: 'echo tailscale ssh connected' },
      { type: 'NEW_SESSION' },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: tailscale ssh workflow simulated' },
    ],
  },
};

export function resolveQuickPreset(presetId: string) {
  return QUICK_PRESETS[presetId];
}
