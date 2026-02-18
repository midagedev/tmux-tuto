import { describe, expect, it } from 'vitest';
import { extractCommandFromPromptLine } from './missionBridge';

describe('extractCommandFromPromptLine', () => {
  it('extracts a normal shell command', () => {
    const result = extractCommandFromPromptLine('(none):~# tmux -V');
    expect(result).toBe('tmux -V');
  });

  it('ignores internal probe command even when line is wrapped', () => {
    const result = extractCommandFromPromptLine('(none):~# TMUXWEB_TMUX=0; tmux -V >/dev/null 2>&1 && TMUXWEB_TMUX=1');
    expect(result).toBeNull();
  });
});
