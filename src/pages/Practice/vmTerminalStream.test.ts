import { describe, expect, it } from 'vitest';
import {
  consumeProbeOutputByte,
  consumeTerminalInputData,
  consumeTerminalOutputByte,
  createInitialTerminalInputCaptureState,
  createInitialTerminalOutputCaptureState,
} from './vmTerminalStream';

describe('vmTerminalStream', () => {
  it('captures shell commands from terminal input data', () => {
    const first = consumeTerminalInputData('tmux new-session', createInitialTerminalInputCaptureState());
    expect(first.commands).toEqual([]);

    const second = consumeTerminalInputData('\n', first.nextState);
    expect(second.commands).toEqual(['tmux new-session']);
    expect(second.nextState).toEqual({
      lineBuffer: '',
      inEscapeSequence: false,
      tmuxPrefixPending: false,
      tmuxPrefixEscapeBuffer: null,
    });
  });

  it('ignores escape sequences and handles backspace/control reset in input stream', () => {
    const withEscape = consumeTerminalInputData('abc\u001b[A', createInitialTerminalInputCaptureState());
    expect(withEscape.commands).toEqual([]);
    expect(withEscape.nextState).toEqual({
      lineBuffer: 'abcA',
      inEscapeSequence: false,
      tmuxPrefixPending: false,
      tmuxPrefixEscapeBuffer: null,
    });

    const withBackspace = consumeTerminalInputData('de\b\n', withEscape.nextState);
    expect(withBackspace.commands).toEqual(['abcAd']);

    const withReset = consumeTerminalInputData('hello\u0015tmux ls\n', createInitialTerminalInputCaptureState());
    expect(withReset.commands).toEqual(['tmux ls']);
  });

  it('ignores tmux prefix shortcuts before capturing a shell command', () => {
    const initial = createInitialTerminalInputCaptureState();
    const withShortcut = consumeTerminalInputData('\u0002c', initial);
    expect(withShortcut.commands).toEqual([]);
    expect(withShortcut.nextState).toEqual({
      lineBuffer: '',
      inEscapeSequence: false,
      tmuxPrefixPending: false,
      tmuxPrefixEscapeBuffer: null,
    });

    const withCommand = consumeTerminalInputData('tmux rename-window dev\n', withShortcut.nextState);
    expect(withCommand.commands).toEqual(['tmux rename-window dev']);
  });

  it('keeps tmux prefix escape sequences out of shell command capture', () => {
    const initial = createInitialTerminalInputCaptureState();
    const first = consumeTerminalInputData('\u0002\u001b', initial);
    expect(first.nextState.tmuxPrefixPending).toBe(true);
    expect(first.nextState.tmuxPrefixEscapeBuffer).toBe('\u001b');

    const second = consumeTerminalInputData('[A', first.nextState);
    expect(second.nextState.tmuxPrefixPending).toBe(false);
    expect(second.nextState.tmuxPrefixEscapeBuffer).toBeNull();
    expect(second.nextState.lineBuffer).toBe('');

    const withCommand = consumeTerminalInputData('tmux list-windows\n', second.nextState);
    expect(withCommand.commands).toEqual(['tmux list-windows']);
  });

  it('captures completed lines from terminal output and preserves existing escape handling', () => {
    const base = createInitialTerminalOutputCaptureState();
    const step1 = consumeTerminalOutputByte('a'.charCodeAt(0), base);
    const step2 = consumeTerminalOutputByte('b'.charCodeAt(0), step1.nextState);
    const step3 = consumeTerminalOutputByte(0x1b, step2.nextState);
    const step4 = consumeTerminalOutputByte('['.charCodeAt(0), step3.nextState);
    const step5 = consumeTerminalOutputByte('K'.charCodeAt(0), step4.nextState);
    const step6 = consumeTerminalOutputByte('c'.charCodeAt(0), step5.nextState);
    const step7 = consumeTerminalOutputByte('\n'.charCodeAt(0), step6.nextState);

    expect(step7.completedLine).toBe('abKc');
    expect(step7.nextState).toEqual({
      lineBuffer: '',
      inEscapeSequence: false,
    });
  });

  it('handles probe output line boundaries', () => {
    const a = consumeProbeOutputByte('x'.charCodeAt(0), '');
    const b = consumeProbeOutputByte('y'.charCodeAt(0), a.nextLineBuffer);
    const c = consumeProbeOutputByte('\r'.charCodeAt(0), b.nextLineBuffer);
    const d = consumeProbeOutputByte('\n'.charCodeAt(0), c.nextLineBuffer);

    expect(d.completedLine).toBe('xy');
    expect(d.nextLineBuffer).toBe('');
  });

  it('preserves tab delimiters from probe output snapshots', () => {
    const a = consumeProbeOutputByte('1'.charCodeAt(0), '');
    const b = consumeProbeOutputByte('\t'.charCodeAt(0), a.nextLineBuffer);
    const c = consumeProbeOutputByte('2'.charCodeAt(0), b.nextLineBuffer);
    const d = consumeProbeOutputByte('\n'.charCodeAt(0), c.nextLineBuffer);

    expect(d.completedLine).toBe('1\t2');
  });
});
