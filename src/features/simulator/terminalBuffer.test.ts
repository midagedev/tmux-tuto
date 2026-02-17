import { describe, expect, it } from 'vitest';
import {
  appendOutput,
  createTerminalBuffer,
  getViewportLines,
  scrollViewport,
  setViewportToBottom,
} from './terminalBuffer';

describe('terminalBuffer', () => {
  it('wraps long lines based on terminal width', () => {
    const initial = createTerminalBuffer({ width: 5, height: 3, scrollbackLimit: 20 });
    const next = appendOutput(initial, 'abcdefghij');

    expect(next.lines.map((line) => line.text)).toEqual(['abcde', 'fghij']);
    expect(next.lines.map((line) => line.wrapped)).toEqual([true, false]);
  });

  it('keeps viewport scrolling within valid bounds', () => {
    const initial = createTerminalBuffer({ width: 20, height: 2, scrollbackLimit: 20 });
    const withLines = appendOutput(initial, 'line-1\nline-2\nline-3\nline-4');

    expect(getViewportLines(withLines).map((line) => line.text)).toEqual(['line-3', 'line-4']);

    const scrolledUp = scrollViewport(withLines, 1);
    expect(getViewportLines(scrolledUp).map((line) => line.text)).toEqual(['line-2', 'line-3']);

    const scrolledDown = scrollViewport(scrolledUp, -99);
    expect(getViewportLines(scrolledDown).map((line) => line.text)).toEqual(['line-3', 'line-4']);

    const backToBottom = setViewportToBottom(scrolledUp);
    expect(getViewportLines(backToBottom).map((line) => line.text)).toEqual(['line-3', 'line-4']);
  });

  it('applies 3000+ scrollback limit and keeps recent lines', () => {
    const initial = createTerminalBuffer({ width: 40, height: 10, scrollbackLimit: 3000 });
    const payload = Array.from({ length: 3500 }, (_, index) => `line-${index}`).join('\n');
    const next = appendOutput(initial, payload);

    expect(next.lines).toHaveLength(3000);
    expect(next.lines[0]?.text).toBe('line-500');
    expect(next.lines[next.lines.length - 1]?.text).toBe('line-3499');
  });
});
