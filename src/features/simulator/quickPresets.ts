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
  'cs-detach': {
    id: 'cs-detach',
    description: 'Simulate detaching a session',
    actions: [{ type: 'ADD_MESSAGE', payload: 'Practice preset: detached from session (simulated)' }],
  },
  'cs-attach-main': {
    id: 'cs-attach-main',
    description: 'Simulate attaching to main session',
    actions: [{ type: 'NEW_SESSION' }, { type: 'ADD_MESSAGE', payload: 'Practice preset: tmux attach -t main' }],
  },
  'cs-layout-tiled': {
    id: 'cs-layout-tiled',
    description: 'Simulate tiled layout reset',
    actions: [{ type: 'EXECUTE_COMMAND', payload: 'tmux select-layout tiled' }],
  },
  'cs-list-panes': {
    id: 'cs-list-panes',
    description: 'Simulate listing panes',
    actions: [{ type: 'EXECUTE_COMMAND', payload: "tmux list-panes -a -F '#S:#I.#P #{pane_current_command}'" }],
  },
  'cs-capture-pane-tail': {
    id: 'cs-capture-pane-tail',
    description: 'Simulate capture-pane tail check',
    actions: [{ type: 'EXECUTE_COMMAND', payload: 'tmux capture-pane -t dev-server -p | tail -50' }],
  },
  'cs-escape-time': {
    id: 'cs-escape-time',
    description: 'Simulate escape-time tuning',
    actions: [{ type: 'EXECUTE_COMMAND', payload: 'tmux set -sg escape-time 10' }],
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
  'cs-code-log-3pane-loop': {
    id: 'cs-code-log-3pane-loop',
    description: 'Simulate code/test/log 3-pane workflow',
    actions: [
      { type: 'SPLIT_PANE', payload: 'vertical' },
      { type: 'SPLIT_PANE', payload: 'horizontal' },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: 3-pane workflow simulated' },
    ],
  },
  'cs-scrollback-clipboard-osc52': {
    id: 'cs-scrollback-clipboard-osc52',
    description: 'Simulate copy-mode search and clipboard flow',
    actions: [
      { type: 'ENTER_COPY_MODE' },
      { type: 'RUN_COPY_SEARCH', payload: 'ERROR' },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: copy/search/clipboard workflow simulated' },
    ],
  },
  'cs-key-input-troubleshooting': {
    id: 'cs-key-input-troubleshooting',
    description: 'Simulate key latency troubleshooting',
    actions: [
      { type: 'EXECUTE_COMMAND', payload: 'tmux show -sg escape-time' },
      { type: 'EXECUTE_COMMAND', payload: 'tmux set -sg escape-time 10' },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: key troubleshooting workflow simulated' },
    ],
  },
  'cs-terminal-render-troubleshooting': {
    id: 'cs-terminal-render-troubleshooting',
    description: 'Simulate terminal rendering troubleshooting',
    actions: [
      { type: 'EXECUTE_COMMAND', payload: 'echo $TERM' },
      { type: 'EXECUTE_COMMAND', payload: 'tmux refresh-client -S' },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: terminal troubleshooting workflow simulated' },
    ],
  },
  'cs-claude-worktree-sessions': {
    id: 'cs-claude-worktree-sessions',
    description: 'Simulate Claude Code parallel worktree sessions',
    actions: [
      { type: 'NEW_SESSION' },
      { type: 'NEW_WINDOW' },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: worktree + tmux session mapping simulated' },
    ],
  },
  'cs-claude-dev-server-split': {
    id: 'cs-claude-dev-server-split',
    description: 'Simulate detached dev server workflow',
    actions: [
      { type: 'EXECUTE_COMMAND', payload: "tmux new-session -d -s dev-server 'pnpm dev'" },
      { type: 'EXECUTE_COMMAND', payload: 'tmux capture-pane -t dev-server -p | tail -50' },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: detached dev server workflow simulated' },
    ],
  },
  'cs-agent-teams-tmux-mode': {
    id: 'cs-agent-teams-tmux-mode',
    description: 'Simulate agent teams tmux mode checks',
    actions: [
      { type: 'SPLIT_PANE', payload: 'vertical' },
      { type: 'EXECUTE_COMMAND', payload: "tmux list-panes -a -F '#S:#I.#P #{pane_current_command}'" },
      { type: 'ADD_MESSAGE', payload: 'Practice preset: agent teams tmux checks simulated' },
    ],
  },
};

export function resolveQuickPreset(presetId: string) {
  return QUICK_PRESETS[presetId];
}
