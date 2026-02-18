export type TmuxShortcutTelemetryState = {
  prefixPending: boolean;
  prefixEscapeBuffer: string | null;
  copySearchPending: boolean;
};

export type TmuxShortcutTelemetry = {
  syntheticCommands: string[];
  shouldProbeSearch: boolean;
};

function isPrefixTriggerKey(char: string) {
  return char === '\u0001' || char === '\u0002';
}

function isEscapeSequenceTerminator(char: string) {
  return char >= '@' && char <= '~';
}

function mapPrefixTokenToCommand(token: string): string | null {
  switch (token) {
    case '%':
      return 'tmux split-window -h';
    case '"':
      return 'tmux split-window -v';
    case 'c':
      return 'tmux new-window';
    case 'n':
      return 'tmux next-window';
    case 'p':
      return 'tmux previous-window';
    case 'd':
      return 'tmux detach-client';
    case '[':
      return 'tmux copy-mode';
    case ':':
      return 'tmux command-prompt -p "cmd"';
    case 'w':
      return 'tmux choose-tree -Z; tmux list-windows';
    case 'h':
      return 'tmux select-pane -L';
    case 'j':
      return 'tmux select-pane -D';
    case 'k':
      return 'tmux select-pane -U';
    case 'l':
      return 'tmux select-pane -R';
    case '\u001b[A':
    case '\u001bOA':
      return 'tmux select-pane -U';
    case '\u001b[B':
    case '\u001bOB':
      return 'tmux select-pane -D';
    case '\u001b[C':
    case '\u001bOC':
      return 'tmux select-pane -R';
    case '\u001b[D':
    case '\u001bOD':
      return 'tmux select-pane -L';
    default:
      return null;
  }
}

export function createTmuxShortcutTelemetryState(): TmuxShortcutTelemetryState {
  return {
    prefixPending: false,
    prefixEscapeBuffer: null,
    copySearchPending: false,
  };
}

export function parseTmuxShortcutTelemetry(
  input: string,
  state: TmuxShortcutTelemetryState,
  options: { inCopyMode: boolean },
): TmuxShortcutTelemetry {
  const syntheticCommands: string[] = [];
  let shouldProbeSearch = false;

  for (const char of input) {
    if (state.prefixEscapeBuffer !== null) {
      state.prefixEscapeBuffer += char;
      const shouldFinalizeEscapeToken =
        isEscapeSequenceTerminator(char) &&
        state.prefixEscapeBuffer !== '\u001b[' &&
        state.prefixEscapeBuffer !== '\u001bO';
      if (shouldFinalizeEscapeToken) {
        const mapped = mapPrefixTokenToCommand(state.prefixEscapeBuffer);
        if (mapped) {
          syntheticCommands.push(mapped);
        }
        state.prefixPending = false;
        state.prefixEscapeBuffer = null;
      }
      continue;
    }

    if (state.prefixPending) {
      if (char === '\u001b') {
        state.prefixEscapeBuffer = '\u001b';
        continue;
      }

      const mapped = mapPrefixTokenToCommand(char);
      if (mapped) {
        syntheticCommands.push(mapped);
      }
      state.prefixPending = false;
      continue;
    }

    if (isPrefixTriggerKey(char)) {
      state.prefixPending = true;
      continue;
    }

    if (!options.inCopyMode) {
      state.copySearchPending = false;
      continue;
    }

    if (state.copySearchPending && (char === '\r' || char === '\n')) {
      shouldProbeSearch = true;
      state.copySearchPending = false;
      continue;
    }

    if (char === '\u001b' || char === '\u0003') {
      state.copySearchPending = false;
      continue;
    }

    if (char === '/') {
      state.copySearchPending = true;
    }
  }

  return {
    syntheticCommands,
    shouldProbeSearch,
  };
}
