export type TerminalInputCaptureState = {
  lineBuffer: string;
  inEscapeSequence: boolean;
};

export type TerminalOutputCaptureState = {
  lineBuffer: string;
  inEscapeSequence: boolean;
};

function isPrintableOrTab(char: string) {
  return char >= ' ' || char === '\t';
}

export function createInitialTerminalInputCaptureState(): TerminalInputCaptureState {
  return {
    lineBuffer: '',
    inEscapeSequence: false,
  };
}

export function createInitialTerminalOutputCaptureState(): TerminalOutputCaptureState {
  return {
    lineBuffer: '',
    inEscapeSequence: false,
  };
}

export function consumeTerminalInputData(data: string, state: TerminalInputCaptureState) {
  const commands: string[] = [];
  let lineBuffer = state.lineBuffer;
  let inEscapeSequence = state.inEscapeSequence;

  for (const char of data) {
    if (inEscapeSequence) {
      if (char >= '@' && char <= '~') {
        inEscapeSequence = false;
      }
      continue;
    }

    if (char === '\u001b') {
      inEscapeSequence = true;
      continue;
    }

    if (char === '\r' || char === '\n') {
      const command = lineBuffer.trim();
      lineBuffer = '';
      if (command) {
        commands.push(command);
      }
      continue;
    }

    if (char === '\u0003' || char === '\u0004' || char === '\u0015') {
      lineBuffer = '';
      continue;
    }

    if (char === '\b' || char === String.fromCharCode(127)) {
      lineBuffer = lineBuffer.slice(0, -1);
      continue;
    }

    if (char >= ' ') {
      lineBuffer += char;
    }
  }

  return {
    nextState: {
      lineBuffer,
      inEscapeSequence,
    },
    commands,
  };
}

export function consumeTerminalOutputByte(value: number, state: TerminalOutputCaptureState) {
  const char = String.fromCharCode(value & 0xff);
  let lineBuffer = state.lineBuffer;
  let inEscapeSequence = state.inEscapeSequence;

  if (inEscapeSequence) {
    if (char >= '@' && char <= '~') {
      inEscapeSequence = false;
    }
    return {
      nextState: {
        lineBuffer,
        inEscapeSequence,
      },
      completedLine: null as string | null,
    };
  }

  if (char === '\u001b') {
    return {
      nextState: {
        lineBuffer,
        inEscapeSequence: true,
      },
      completedLine: null as string | null,
    };
  }

  if (char === '\r') {
    return {
      nextState: {
        lineBuffer,
        inEscapeSequence,
      },
      completedLine: null as string | null,
    };
  }

  if (char === '\n') {
    return {
      nextState: {
        lineBuffer: '',
        inEscapeSequence,
      },
      completedLine: lineBuffer,
    };
  }

  if (char === '\b' || char === String.fromCharCode(127)) {
    lineBuffer = lineBuffer.slice(0, -1);
    return {
      nextState: {
        lineBuffer,
        inEscapeSequence,
      },
      completedLine: null as string | null,
    };
  }

  if (isPrintableOrTab(char)) {
    lineBuffer += char;
  }

  return {
    nextState: {
      lineBuffer,
      inEscapeSequence,
    },
    completedLine: null as string | null,
  };
}

export function consumeProbeOutputByte(value: number, lineBuffer: string) {
  const char = String.fromCharCode(value & 0xff);
  if (char === '\r') {
    return {
      nextLineBuffer: lineBuffer,
      completedLine: null as string | null,
    };
  }

  if (char === '\n') {
    return {
      nextLineBuffer: '',
      completedLine: lineBuffer,
    };
  }

  if (isPrintableOrTab(char)) {
    return {
      nextLineBuffer: `${lineBuffer}${char}`,
      completedLine: null as string | null,
    };
  }

  return {
    nextLineBuffer: lineBuffer,
    completedLine: null as string | null,
  };
}
