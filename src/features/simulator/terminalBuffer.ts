export type TerminalBufferLine = {
  id: number;
  text: string;
  wrapped: boolean;
};

export type TerminalBufferState = {
  width: number;
  height: number;
  scrollbackLimit: number;
  lines: TerminalBufferLine[];
  viewportTop: number;
  nextLineId: number;
};

type TerminalBufferInit = {
  width: number;
  height: number;
  scrollbackLimit?: number;
};

const DEFAULT_SCROLLBACK_LIMIT = 3000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLine(raw: string) {
  return raw.replace(/\t/g, '    ');
}

function wrapLine(text: string, width: number) {
  const safeWidth = Math.max(1, width);
  const normalized = normalizeLine(text);

  if (normalized.length === 0) {
    return [''];
  }

  const wrapped: string[] = [];
  for (let cursor = 0; cursor < normalized.length; cursor += safeWidth) {
    wrapped.push(normalized.slice(cursor, cursor + safeWidth));
  }

  return wrapped;
}

function buildLines(lines: string[], nextLineId: number, width: number) {
  const nextBufferLines: TerminalBufferLine[] = [];
  let cursor = nextLineId;

  lines.forEach((line) => {
    const wrapped = wrapLine(line, width);
    wrapped.forEach((segment, index) => {
      nextBufferLines.push({
        id: cursor,
        text: segment,
        wrapped: index < wrapped.length - 1,
      });
      cursor += 1;
    });
  });

  return { lines: nextBufferLines, nextLineId: cursor };
}

function getMaxViewportTop(state: TerminalBufferState) {
  return Math.max(0, state.lines.length - state.height);
}

export function createTerminalBuffer(init: TerminalBufferInit): TerminalBufferState {
  return {
    width: Math.max(1, init.width),
    height: Math.max(1, init.height),
    scrollbackLimit: Math.max(1, init.scrollbackLimit ?? DEFAULT_SCROLLBACK_LIMIT),
    lines: [],
    viewportTop: 0,
    nextLineId: 1,
  };
}

export function appendOutput(state: TerminalBufferState, text: string): TerminalBufferState {
  const source = text.replace(/\r\n/g, '\n');
  const incoming = source.split('\n');
  const { lines: appendedLines, nextLineId } = buildLines(incoming, state.nextLineId, state.width);
  const wasAtBottom = state.viewportTop >= getMaxViewportTop(state);
  const merged = [...state.lines, ...appendedLines];
  const overflow = Math.max(0, merged.length - state.scrollbackLimit);
  const trimmed = overflow > 0 ? merged.slice(overflow) : merged;

  const baseState: TerminalBufferState = {
    ...state,
    lines: trimmed,
    nextLineId,
  };

  if (wasAtBottom) {
    return {
      ...baseState,
      viewportTop: getMaxViewportTop(baseState),
    };
  }

  return {
    ...baseState,
    viewportTop: clamp(state.viewportTop, 0, getMaxViewportTop(baseState)),
  };
}

export function setViewportToBottom(state: TerminalBufferState): TerminalBufferState {
  return {
    ...state,
    viewportTop: getMaxViewportTop(state),
  };
}

export function clearTerminal(state: TerminalBufferState): TerminalBufferState {
  return {
    ...state,
    lines: [],
    viewportTop: 0,
  };
}

export function scrollViewport(state: TerminalBufferState, delta: number): TerminalBufferState {
  const maxTop = getMaxViewportTop(state);
  const nextTop = clamp(state.viewportTop - delta, 0, maxTop);

  return {
    ...state,
    viewportTop: nextTop,
  };
}

export function getViewportLines(state: TerminalBufferState) {
  const end = state.viewportTop + state.height;
  return state.lines.slice(state.viewportTop, end);
}
