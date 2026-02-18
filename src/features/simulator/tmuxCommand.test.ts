import { describe, expect, it } from 'vitest';
import { parseTmuxCommand } from './tmuxCommand';

describe('tmuxCommand parser', () => {
  it('parses no-arg command subset', () => {
    expect(parseTmuxCommand('new-window')).toEqual({ type: 'NEW_WINDOW' });
    expect(parseTmuxCommand('new-session')).toEqual({ type: 'NEW_SESSION' });
    expect(parseTmuxCommand('next-window')).toEqual({ type: 'NEXT_WINDOW' });
    expect(parseTmuxCommand('previous-window')).toEqual({ type: 'PREV_WINDOW' });
    expect(parseTmuxCommand('kill-pane')).toEqual({ type: 'KILL_ACTIVE_PANE' });
    expect(parseTmuxCommand('copy-mode')).toEqual({ type: 'ENTER_COPY_MODE' });
  });

  it('parses split/select command subset', () => {
    expect(parseTmuxCommand('split-window -h')).toEqual({ type: 'SPLIT_PANE', payload: 'vertical' });
    expect(parseTmuxCommand('split-window -v')).toEqual({ type: 'SPLIT_PANE', payload: 'horizontal' });
    expect(parseTmuxCommand('select-pane -L')).toEqual({ type: 'FOCUS_PANE', payload: 'left' });
    expect(parseTmuxCommand('select-pane -R')).toEqual({ type: 'FOCUS_PANE', payload: 'right' });
    expect(parseTmuxCommand('select-pane -U')).toEqual({ type: 'FOCUS_PANE', payload: 'up' });
    expect(parseTmuxCommand('select-pane -D')).toEqual({ type: 'FOCUS_PANE', payload: 'down' });
  });

  it('returns null on unsupported/invalid command syntax', () => {
    expect(parseTmuxCommand('   ')).toBeNull();
    expect(parseTmuxCommand('new-window foo')).toBeNull();
    expect(parseTmuxCommand('split-window')).toBeNull();
    expect(parseTmuxCommand('split-window -x')).toBeNull();
    expect(parseTmuxCommand('split-window -h -v')).toBeNull();
    expect(parseTmuxCommand('select-pane')).toBeNull();
    expect(parseTmuxCommand('select-pane -X')).toBeNull();
    expect(parseTmuxCommand('unknown-cmd')).toBeNull();
  });

  it('parses quoted flags with extra whitespace', () => {
    expect(parseTmuxCommand('  split-window   "-h"  ')).toEqual({ type: 'SPLIT_PANE', payload: 'vertical' });
    expect(parseTmuxCommand(" select-pane '-D' ")).toEqual({ type: 'FOCUS_PANE', payload: 'down' });
  });
});
