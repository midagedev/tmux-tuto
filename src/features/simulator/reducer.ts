import {
  createInitialSimulatorState,
  createPane,
  createSession,
  createWindow,
  getActiveShellSession,
  getActiveSession,
  getActiveWindow,
  type ShellSession,
  type TmuxPane,
  type SimulatorMode,
  type SimulatorState,
} from './model';
import { executeShellCommand } from './shellCommands';
import { appendOutput, clearTerminal, scrollViewport, setViewportTop } from './terminalBuffer';
import { applyPaneLayout, resolveLayoutForPaneCount } from './layout';
import { parseTmuxCommand } from './tmuxCommand';
import { applyTmuxConfig, parseTmuxConfig } from './tmuxConfig';

export type SplitDirection = 'vertical' | 'horizontal';
export type FocusDirection = 'left' | 'right' | 'up' | 'down';

export type SimulatorAction =
  | { type: 'SET_PREFIX_KEY'; payload: 'C-b' | 'C-a' }
  | { type: 'SET_MODE'; payload: SimulatorMode }
  | { type: 'ENTER_PREFIX_PENDING'; payload: { at: number } }
  | { type: 'SET_REPEAT_WINDOW'; payload: number | null }
  | { type: 'SET_COMMAND_BUFFER'; payload: string }
  | { type: 'SET_COMMAND_LINE'; payload: { buffer: string; cursor: number } }
  | { type: 'NAVIGATE_COMMAND_HISTORY'; payload: 'up' | 'down' }
  | { type: 'CLEAR_COMMAND_BUFFER' }
  | { type: 'ADD_MESSAGE'; payload: string }
  | { type: 'RECORD_ACTION'; payload: string }
  | { type: 'SPLIT_PANE'; payload: SplitDirection }
  | { type: 'SET_ACTIVE_PANE'; payload: string }
  | { type: 'SCROLL_PANE'; payload: { paneId: string; delta: number } }
  | { type: 'FOCUS_PANE'; payload: FocusDirection }
  | { type: 'RESIZE_PANE'; payload: { axis: 'x' | 'y'; delta: number } }
  | { type: 'NEW_WINDOW' }
  | { type: 'NEXT_WINDOW' }
  | { type: 'PREV_WINDOW' }
  | { type: 'KILL_ACTIVE_PANE' }
  | { type: 'NEW_SESSION' }
  | { type: 'EXECUTE_COMMAND'; payload: string }
  | { type: 'ENTER_COPY_MODE' }
  | { type: 'EXIT_COPY_MODE' }
  | { type: 'RUN_COPY_SEARCH'; payload: string }
  | { type: 'ADVANCE_COPY_MATCH'; payload: 1 | -1 }
  | { type: 'APPLY_TMUX_CONFIG'; payload: { content: string; sourcePath: string } }
  | { type: 'INIT_SCENARIO'; payload: string }
  | { type: 'LOAD_SNAPSHOT'; payload: SimulatorState }
  | { type: 'RESET' };

function mapSessionWindows(state: SimulatorState, fn: (window: ReturnType<typeof getActiveWindow>) => ReturnType<typeof getActiveWindow>) {
  return state.tmux.sessions.map((session) => {
    if (session.id !== state.tmux.activeSessionId) {
      return session;
    }

    return {
      ...session,
      windows: session.windows.map((window) =>
        window.id === session.activeWindowId ? fn(window as ReturnType<typeof getActiveWindow>) : window,
      ),
    };
  });
}

function mapShellSessions(state: SimulatorState, fn: (session: ShellSession) => ShellSession) {
  return state.shell.sessions.map((session) =>
    session.id === state.shell.activeSessionId ? fn(session) : session,
  );
}

function withHistory(state: SimulatorState, actionId: string, message?: string): SimulatorState {
  return {
    ...state,
    actionHistory: [...state.actionHistory.slice(-49), actionId],
    messages: message ? [...state.messages.slice(-9), message] : state.messages,
  };
}

function withCommandHistory(state: SimulatorState, command: string): SimulatorState {
  if (!command) {
    return state;
  }

  const sessions = mapShellSessions(state, (session) => ({
    ...session,
    history: [...session.history, command].slice(-200),
  }));

  return {
    ...state,
    shell: {
      ...state.shell,
      sessions,
    },
  };
}

function withActivePane(
  state: SimulatorState,
  fn: (pane: TmuxPane) => TmuxPane,
): SimulatorState {
  const sessions = mapSessionWindows(state, (window) => ({
    ...window,
    panes: window.panes.map((pane) => (pane.id === window.activePaneId ? fn(pane) : pane)),
  }));

  return {
    ...state,
    tmux: {
      ...state.tmux,
      sessions,
    },
  };
}

function appendOutputToActivePane(state: SimulatorState, outputLines: string[]) {
  if (outputLines.length === 0) {
    return state;
  }

  return withActivePane(state, (pane) => {
    const terminal = appendOutput(pane.terminal, outputLines.join('\n'));
    return {
      ...pane,
      terminal,
      buffer: terminal.lines.map((line) => line.text),
    };
  });
}

function clearActivePane(state: SimulatorState) {
  return withActivePane(state, (pane) => ({
    ...pane,
    terminal: clearTerminal(pane.terminal),
    buffer: [],
  }));
}

function focusActivePaneToLine(state: SimulatorState, lineIndex: number) {
  return withActivePane(state, (pane) => ({
    ...pane,
    terminal: setViewportTop(pane.terminal, lineIndex),
  }));
}

function normalizePath(path: string) {
  const segments: string[] = [];
  path.split('/').forEach((segment) => {
    if (!segment || segment === '.') {
      return;
    }

    if (segment === '..') {
      segments.pop();
      return;
    }

    segments.push(segment);
  });

  const normalized = `/${segments.join('/')}`.replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
}

function resolvePath(cwd: string, input: string) {
  if (input.startsWith('/')) {
    return normalizePath(input);
  }

  return normalizePath(`${cwd}/${input}`);
}

function moveFocus(panes: TmuxPane[], activePaneId: string, direction: FocusDirection) {
  if (panes.length <= 1) {
    return activePaneId;
  }

  const currentPaneIndex = panes.findIndex((pane) => pane.id === activePaneId);
  if (currentPaneIndex < 0) {
    return panes[0].id;
  }

  const centers = panes.map((pane, index) => {
    const x = Number.isFinite(pane.x) ? pane.x : index * 10;
    const y = Number.isFinite(pane.y) ? pane.y : 0;
    return {
      pane,
      centerX: x + pane.width / 2,
      centerY: y + pane.height / 2,
    };
  });
  const current = centers[currentPaneIndex];

  const candidates = centers.filter((candidate) => {
    if (candidate.pane.id === current.pane.id) {
      return false;
    }

    if (direction === 'left') {
      return candidate.centerX < current.centerX;
    }

    if (direction === 'right') {
      return candidate.centerX > current.centerX;
    }

    if (direction === 'up') {
      return candidate.centerY < current.centerY;
    }

    return candidate.centerY > current.centerY;
  });

  if (candidates.length === 0) {
    return activePaneId;
  }

  candidates.sort((a, b) => {
    const primaryA =
      direction === 'left' || direction === 'right'
        ? Math.abs(a.centerX - current.centerX)
        : Math.abs(a.centerY - current.centerY);
    const primaryB =
      direction === 'left' || direction === 'right'
        ? Math.abs(b.centerX - current.centerX)
        : Math.abs(b.centerY - current.centerY);

    if (primaryA !== primaryB) {
      return primaryA - primaryB;
    }

    const secondaryA =
      direction === 'left' || direction === 'right'
        ? Math.abs(a.centerY - current.centerY)
        : Math.abs(a.centerX - current.centerX);
    const secondaryB =
      direction === 'left' || direction === 'right'
        ? Math.abs(b.centerY - current.centerY)
        : Math.abs(b.centerX - current.centerX);

    return secondaryA - secondaryB;
  });

  return candidates[0].pane.id;
}

export function simulatorReducer(state: SimulatorState, action: SimulatorAction): SimulatorState {
  switch (action.type) {
    case 'SET_PREFIX_KEY': {
      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            config: {
              ...state.tmux.config,
              prefixKey: action.payload,
            },
          },
        },
        'sim.prefix.set',
        `Prefix set to ${action.payload}`,
      );
    }

    case 'SET_MODE': {
      return {
        ...state,
        mode: {
          ...state.mode,
          value: action.payload,
          prefixEnteredAt: action.payload === 'PREFIX_PENDING' ? state.mode.prefixEnteredAt : null,
        },
      };
    }

    case 'ENTER_PREFIX_PENDING': {
      return {
        ...state,
        mode: {
          ...state.mode,
          value: 'PREFIX_PENDING',
          prefixEnteredAt: action.payload.at,
        },
      };
    }

    case 'SET_REPEAT_WINDOW': {
      return {
        ...state,
        mode: {
          ...state.mode,
          repeatUntil: action.payload,
        },
      };
    }

    case 'SET_COMMAND_BUFFER': {
      return {
        ...state,
        mode: {
          ...state.mode,
          commandBuffer: action.payload,
          commandCursor: action.payload.length,
          historyIndex: null,
          historyDraft: '',
        },
      };
    }

    case 'SET_COMMAND_LINE': {
      const cursor = Math.min(Math.max(0, action.payload.cursor), action.payload.buffer.length);
      return {
        ...state,
        mode: {
          ...state.mode,
          commandBuffer: action.payload.buffer,
          commandCursor: cursor,
          historyIndex: null,
          historyDraft: '',
        },
      };
    }

    case 'NAVIGATE_COMMAND_HISTORY': {
      const activeShellSession = getActiveShellSession(state);
      const history = activeShellSession.history;
      if (history.length === 0) {
        return state;
      }

      const currentIndex = state.mode.historyIndex;
      if (action.payload === 'up') {
        const nextIndex = currentIndex === null ? history.length - 1 : Math.max(0, currentIndex - 1);
        const nextBuffer = history[nextIndex] ?? '';

        return {
          ...state,
          mode: {
            ...state.mode,
            commandBuffer: nextBuffer,
            commandCursor: nextBuffer.length,
            historyIndex: nextIndex,
            historyDraft: currentIndex === null ? state.mode.commandBuffer : state.mode.historyDraft,
          },
        };
      }

      if (currentIndex === null) {
        return state;
      }

      if (currentIndex >= history.length - 1) {
        return {
          ...state,
          mode: {
            ...state.mode,
            commandBuffer: state.mode.historyDraft,
            commandCursor: state.mode.historyDraft.length,
            historyIndex: null,
            historyDraft: '',
          },
        };
      }

      const nextIndex = currentIndex + 1;
      const nextBuffer = history[nextIndex] ?? '';
      return {
        ...state,
        mode: {
          ...state.mode,
          commandBuffer: nextBuffer,
          commandCursor: nextBuffer.length,
          historyIndex: nextIndex,
          historyDraft: state.mode.historyDraft,
        },
      };
    }

    case 'CLEAR_COMMAND_BUFFER': {
      return {
        ...state,
        mode: {
          ...state.mode,
          commandBuffer: '',
          commandCursor: 0,
          historyIndex: null,
          historyDraft: '',
        },
      };
    }

    case 'ADD_MESSAGE': {
      return {
        ...state,
        messages: [...state.messages.slice(-9), action.payload],
      };
    }

    case 'RECORD_ACTION': {
      return {
        ...state,
        actionHistory: [...state.actionHistory.slice(-49), action.payload],
      };
    }

    case 'SPLIT_PANE': {
      const windows = mapSessionWindows(state, (window) => {
        const shellSessionId =
          window.panes.find((pane) => pane.id === window.activePaneId)?.shellSessionId ?? state.shell.activeSessionId;
        const nextPane = createPane(shellSessionId);
        const nextPanes = [...window.panes, nextPane];
        const layout = resolveLayoutForPaneCount(nextPanes.length, action.payload);
        const paneGraph = applyPaneLayout(nextPanes, layout);

        return {
          ...window,
          panes: paneGraph,
          activePaneId: nextPane.id,
          layout,
        };
      });

      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            sessions: windows,
          },
        },
        `sim.pane.split.${action.payload}`,
        `Pane split ${action.payload}`,
      );
    }

    case 'FOCUS_PANE': {
      const windows = mapSessionWindows(state, (window) => {
        const nextActivePaneId = moveFocus(window.panes, window.activePaneId, action.payload);
        return {
          ...window,
          activePaneId: nextActivePaneId,
        };
      });

      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            sessions: windows,
          },
        },
        `sim.pane.focus.${action.payload}`,
      );
    }

    case 'SET_ACTIVE_PANE': {
      const windows = mapSessionWindows(state, (window) => {
        const exists = window.panes.some((pane) => pane.id === action.payload);
        if (!exists) {
          return window;
        }

        return {
          ...window,
          activePaneId: action.payload,
        };
      });

      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            sessions: windows,
          },
        },
        'sim.pane.focus.click',
      );
    }

    case 'SCROLL_PANE': {
      const windows = mapSessionWindows(state, (window) => ({
        ...window,
        panes: window.panes.map((pane) => {
          if (pane.id !== action.payload.paneId) {
            return pane;
          }

          const terminal = scrollViewport(pane.terminal, action.payload.delta);
          return {
            ...pane,
            terminal,
          };
        }),
      }));

      return {
        ...state,
        tmux: {
          ...state.tmux,
          sessions: windows,
        },
      };
    }

    case 'RESIZE_PANE': {
      const windows = mapSessionWindows(state, (window) => {
        const panes = window.panes.map((pane) => {
          if (pane.id !== window.activePaneId) {
            return pane;
          }

          return {
            ...pane,
            width: action.payload.axis === 'x' ? Math.max(10, pane.width + action.payload.delta) : pane.width,
            height: action.payload.axis === 'y' ? Math.max(5, pane.height + action.payload.delta) : pane.height,
          };
        });

        return {
          ...window,
          panes,
        };
      });

      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            sessions: windows,
          },
        },
        `sim.pane.resize.${action.payload.axis}`,
      );
    }

    case 'NEW_WINDOW': {
      const activeSession = getActiveSession(state);
      const shellSessionId = state.shell.activeSessionId;
      const nextWindow = createWindow(shellSessionId, `${activeSession.windows.length + 1}`);
      const sessions = state.tmux.sessions.map((session) => {
        if (session.id !== activeSession.id) {
          return session;
        }

        return {
          ...session,
          windows: [...session.windows, nextWindow],
          activeWindowId: nextWindow.id,
        };
      });

      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            sessions,
          },
        },
        'sim.window.new',
        'New window created',
      );
    }

    case 'NEXT_WINDOW':
    case 'PREV_WINDOW': {
      const activeSession = getActiveSession(state);
      const windows = activeSession.windows;
      const currentIndex = windows.findIndex((window) => window.id === activeSession.activeWindowId);
      const offset = action.type === 'NEXT_WINDOW' ? 1 : -1;
      const nextIndex = (currentIndex + offset + windows.length) % windows.length;
      const nextWindow = windows[nextIndex];

      const sessions = state.tmux.sessions.map((session) => {
        if (session.id !== activeSession.id) {
          return session;
        }

        return {
          ...session,
          activeWindowId: nextWindow.id,
        };
      });

      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            sessions,
          },
        },
        `sim.window.${action.type === 'NEXT_WINDOW' ? 'next' : 'prev'}`,
      );
    }

    case 'NEW_SESSION': {
      const nextSession = createSession(state.shell.activeSessionId, `session-${state.tmux.sessions.length + 1}`);
      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            sessions: [...state.tmux.sessions, nextSession],
            activeSessionId: nextSession.id,
          },
        },
        'sim.session.new',
        `Session ${nextSession.name} created`,
      );
    }

    case 'KILL_ACTIVE_PANE': {
      const windows = mapSessionWindows(state, (window) => {
        if (window.panes.length <= 1) {
          return window;
        }

        const nextPanes = window.panes.filter((pane) => pane.id !== window.activePaneId);
        const nextActivePane = nextPanes[0];
        const nextLayout = nextPanes.length === 1 ? 'single' : window.layout === 'grid' ? 'vertical' : window.layout;
        const paneGraph = applyPaneLayout(nextPanes, nextLayout);

        return {
          ...window,
          panes: paneGraph,
          activePaneId: nextActivePane.id,
          layout: nextLayout,
        };
      });

      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            sessions: windows,
          },
        },
        'sim.pane.kill',
        'Active pane removed (if possible)',
      );
    }

    case 'EXECUTE_COMMAND': {
      const command = action.payload.trim();
      if (!command) {
        return withHistory(state, 'sim.command.empty', 'Empty command');
      }

      const nextState = withCommandHistory(state, command);
      const tmuxCommand = command.startsWith('tmux ') ? command.slice(5).trim() : command;
      if (tmuxCommand.startsWith('source-file')) {
        const [, filePathRaw] = tmuxCommand.split(/\s+/, 2);
        if (!filePathRaw) {
          return withHistory(nextState, 'sim.config.sourcefile.missing', 'source-file path is required');
        }

        const activeShellSession = getActiveShellSession(nextState);
        const filePath = resolvePath(activeShellSession.workingDirectory, filePathRaw);
        const fileContent = activeShellSession.fileSystem.files[filePath];
        if (typeof fileContent !== 'string') {
          return withHistory(nextState, 'sim.config.sourcefile.missing', `No such file: ${filePathRaw}`);
        }

        return simulatorReducer(nextState, {
          type: 'APPLY_TMUX_CONFIG',
          payload: {
            content: fileContent,
            sourcePath: filePath,
          },
        });
      }

      const activeShellSession = getActiveShellSession(nextState);
      const shellResult = executeShellCommand(activeShellSession, command);
      if (shellResult.handled) {
        let shellState: SimulatorState = {
          ...nextState,
          shell: {
            ...nextState.shell,
            sessions: mapShellSessions(nextState, () => shellResult.shellSession),
          },
        };

        if (shellResult.clearScreen) {
          shellState = clearActivePane(shellState);
        }

        shellState = appendOutputToActivePane(shellState, shellResult.outputLines);
        return withHistory(shellState, 'sim.command.shell');
      }

      const tmuxAction = parseTmuxCommand(tmuxCommand);
      if (tmuxAction) {
        return simulatorReducer(nextState, tmuxAction);
      }

      return withHistory(nextState, 'sim.command.unhandled', `Unsupported command: ${command}`);
    }

    case 'APPLY_TMUX_CONFIG': {
      const parsed = parseTmuxConfig(action.payload.content);
      const applied = applyTmuxConfig(state.tmux.config, parsed.directives);
      const errors = parsed.errors.map((entry) => `L${entry.line}: ${entry.message}`);

      return withHistory(
        {
          ...state,
          tmux: {
            ...state.tmux,
            config: {
              ...applied,
              lastAppliedSource: action.payload.sourcePath,
              errors,
            },
          },
        },
        'sim.config.apply',
        errors.length === 0
          ? `tmux config applied (${action.payload.sourcePath})`
          : `tmux config applied with ${errors.length} error(s)`,
      );
    }

    case 'ENTER_COPY_MODE': {
      return withHistory(
        {
          ...state,
          mode: {
            ...state.mode,
            value: 'COPY_MODE',
          },
        },
        'sim.copymode.enter',
        'Copy mode enabled',
      );
    }

    case 'EXIT_COPY_MODE': {
      return withHistory(
        {
          ...state,
          mode: {
            ...state.mode,
            value: 'NORMAL',
          },
        },
        'sim.copymode.exit',
      );
    }

    case 'RUN_COPY_SEARCH': {
      const activeWindow = getActiveWindow(state);
      const activePane = activeWindow.panes.find((pane) => pane.id === activeWindow.activePaneId);
      const query = action.payload.trim().toLowerCase();
      const matchLineIndices =
        query.length === 0
          ? []
          : (activePane?.terminal.lines ?? [])
              .map((line, index) => ({ line, index }))
              .filter(({ line }) => line.text.toLowerCase().includes(query))
              .map(({ index }) => index);
      const found = matchLineIndices.length > 0;

      let nextState: SimulatorState = {
        ...state,
        mode: {
          ...state.mode,
          value: 'COPY_MODE',
          copyMode: {
            searchQuery: action.payload,
            searchExecuted: true,
            lastMatchFound: found,
            matchLineIndices,
            activeMatchIndex: found ? 0 : -1,
          },
        },
      };

      if (found) {
        nextState = focusActivePaneToLine(nextState, matchLineIndices[0]);
      }

      return withHistory(
        nextState,
        'sim.copymode.search',
        found ? `Search match for "${action.payload}"` : `No match for "${action.payload}"`,
      );
    }

    case 'ADVANCE_COPY_MATCH': {
      const matches = state.mode.copyMode.matchLineIndices;
      if (matches.length === 0) {
        return state;
      }

      const currentIndex = state.mode.copyMode.activeMatchIndex < 0 ? 0 : state.mode.copyMode.activeMatchIndex;
      const nextIndex = (currentIndex + action.payload + matches.length) % matches.length;
      const targetLine = matches[nextIndex];

      const nextState = focusActivePaneToLine(
        {
          ...state,
          mode: {
            ...state.mode,
            copyMode: {
              ...state.mode.copyMode,
              activeMatchIndex: nextIndex,
            },
          },
        },
        targetLine,
      );

      return withHistory(nextState, 'sim.copymode.match.navigate');
    }

    case 'LOAD_SNAPSHOT': {
      return withHistory(action.payload, 'sim.snapshot.load', 'Snapshot restored');
    }

    case 'INIT_SCENARIO': {
      return createInitialSimulatorState({ scenarioPresetId: action.payload });
    }

    case 'RESET': {
      return createInitialSimulatorState();
    }

    default:
      return state;
  }
}
