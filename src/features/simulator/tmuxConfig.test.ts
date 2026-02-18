import { describe, expect, it } from 'vitest';
import { createInitialSimulatorState } from './model';
import { applyTmuxConfig, parseTmuxConfig } from './tmuxConfig';

describe('tmuxConfig parser/apply', () => {
  it('parses and applies valid v1 subset directives', () => {
    const input = [
      'set -g prefix C-a',
      'set -g mouse off',
      'setw -g mode-keys vi',
      'bind c new-window',
      'bind h select-pane -L',
      'unbind c',
    ].join('\n');

    const parsed = parseTmuxConfig(input);
    const base = createInitialSimulatorState().tmux.config;
    const applied = applyTmuxConfig(base, parsed.directives);

    expect(parsed.errors).toEqual([]);
    expect(applied.prefixKey).toBe('C-a');
    expect(applied.mouse).toBe(false);
    expect(applied.modeKeys).toBe('vi');
    expect(applied.binds.c).toBeUndefined();
    expect(applied.binds.h).toBe('select-pane -L');
  });

  it('reports line-level errors for invalid directives', () => {
    const input = [
      'set -g prefix C-x',
      'bind',
      'set-option status off',
    ].join('\n');

    const parsed = parseTmuxConfig(input);

    expect(parsed.directives).toHaveLength(0);
    expect(parsed.errors).toHaveLength(3);
    expect(parsed.errors[0]?.line).toBe(1);
    expect(parsed.errors[1]?.line).toBe(2);
    expect(parsed.errors[2]?.line).toBe(3);
  });
});
