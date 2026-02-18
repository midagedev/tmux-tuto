import { describe, expect, it } from 'vitest';
import {
  createTmuxShortcutTelemetryState,
  parseTmuxShortcutTelemetry,
} from './tmuxShortcutTelemetry';

describe('parseTmuxShortcutTelemetry', () => {
  it('maps prefix + split shortcuts to synthetic tmux commands', () => {
    const state = createTmuxShortcutTelemetryState();
    const result = parseTmuxShortcutTelemetry('\u0002%\u0002"', state, { inCopyMode: false });

    expect(result.syntheticCommands).toEqual(['tmux split-window -h', 'tmux split-window -v']);
    expect(result.shouldProbeSearch).toBe(false);
  });

  it('maps prefix + arrow keys even when escape sequence is chunked', () => {
    const state = createTmuxShortcutTelemetryState();
    const first = parseTmuxShortcutTelemetry('\u0002\u001b', state, { inCopyMode: false });
    const second = parseTmuxShortcutTelemetry('[C', state, { inCopyMode: false });

    expect(first.syntheticCommands).toEqual([]);
    expect(second.syntheticCommands).toEqual(['tmux select-pane -R']);
  });

  it('maps prefix + w to tree/list workflow command', () => {
    const state = createTmuxShortcutTelemetryState();
    const result = parseTmuxShortcutTelemetry('\u0002w', state, { inCopyMode: false });

    expect(result.syntheticCommands).toEqual(['tmux choose-tree -Z; tmux list-windows']);
  });

  it('requests search probe when copy-mode search query is submitted', () => {
    const state = createTmuxShortcutTelemetryState();
    const start = parseTmuxShortcutTelemetry('/', state, { inCopyMode: true });
    const submit = parseTmuxShortcutTelemetry('error\r', state, { inCopyMode: true });

    expect(start.shouldProbeSearch).toBe(false);
    expect(submit.shouldProbeSearch).toBe(true);
  });

  it('does not request search probe outside copy-mode', () => {
    const state = createTmuxShortcutTelemetryState();
    parseTmuxShortcutTelemetry('/', state, { inCopyMode: false });
    const submit = parseTmuxShortcutTelemetry('error\r', state, { inCopyMode: false });

    expect(submit.shouldProbeSearch).toBe(false);
  });
});
