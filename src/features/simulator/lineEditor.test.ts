import { describe, expect, it } from 'vitest';
import { applyLineEditorKey } from './lineEditor';

describe('lineEditor', () => {
  it('supports Ctrl+A and Ctrl+E cursor movement', () => {
    const start = { buffer: 'split-window', cursor: 5 };
    const toHead = applyLineEditorKey(start, 'C-a');
    const toTail = applyLineEditorKey(toHead.state, 'C-e');

    expect(toHead.state.cursor).toBe(0);
    expect(toTail.state.cursor).toBe('split-window'.length);
  });

  it('supports Ctrl+U and Ctrl+K deletion', () => {
    const initial = { buffer: 'new-window', cursor: 3 };
    const ctrlU = applyLineEditorKey(initial, 'C-u');
    const ctrlK = applyLineEditorKey({ buffer: 'split-window -h', cursor: 6 }, 'C-k');

    expect(ctrlU.state).toEqual({ buffer: '-window', cursor: 0 });
    expect(ctrlK.state).toEqual({ buffer: 'split-', cursor: 6 });
  });

  it('handles backspace insertion and enter submit sequence', () => {
    const insert = applyLineEditorKey({ buffer: 'nw-window', cursor: 2 }, 'e');
    const backspace = applyLineEditorKey(insert.state, 'Backspace');
    const submit = applyLineEditorKey(backspace.state, 'Enter');

    expect(backspace.state).toEqual({ buffer: 'nw-window', cursor: 2 });
    expect(submit.submitted).toBe('nw-window');
    expect(submit.state).toEqual({ buffer: '', cursor: 0 });
  });
});
