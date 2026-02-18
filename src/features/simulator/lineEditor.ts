export type LineEditorState = {
    buffer: string;
    cursor: number;
};
export type LineEditorResult = {
    state: LineEditorState;
    submitted?: string;
};
function clampCursor(cursor: number, buffer: string) {
    return Math.min(Math.max(0, cursor), buffer.length);
}
function insertAtCursor(buffer: string, cursor: number, input: string) {
    return `${buffer.slice(0, cursor)}${input}${buffer.slice(cursor)}`;
}
export function applyLineEditorKey(state: LineEditorState, key: string): LineEditorResult {
    const cursor = clampCursor(state.cursor, state.buffer);
    if (key === 'Enter') {
        return {
            state: {
                buffer: '',
                cursor: 0,
            },
            submitted: state.buffer,
        };
    }
    if (key === 'Backspace') {
        if (cursor <= 0) {
            return { state };
        }
        const nextBuffer = `${state.buffer.slice(0, cursor - 1)}${state.buffer.slice(cursor)}`;
        return {
            state: {
                buffer: nextBuffer,
                cursor: cursor - 1,
            },
        };
    }
    if (key === 'ArrowLeft') {
        return {
            state: {
                buffer: state.buffer,
                cursor: Math.max(0, cursor - 1),
            },
        };
    }
    if (key === 'ArrowRight') {
        return {
            state: {
                buffer: state.buffer,
                cursor: Math.min(state.buffer.length, cursor + 1),
            },
        };
    }
    if (key === 'C-a') {
        return {
            state: {
                buffer: state.buffer,
                cursor: 0,
            },
        };
    }
    if (key === 'C-e') {
        return {
            state: {
                buffer: state.buffer,
                cursor: state.buffer.length,
            },
        };
    }
    if (key === 'C-u') {
        return {
            state: {
                buffer: state.buffer.slice(cursor),
                cursor: 0,
            },
        };
    }
    if (key === 'C-k') {
        return {
            state: {
                buffer: state.buffer.slice(0, cursor),
                cursor,
            },
        };
    }
    if (key.length === 1) {
        return {
            state: {
                buffer: insertAtCursor(state.buffer, cursor, key),
                cursor: cursor + 1,
            },
        };
    }
    return { state };
}
