import {
  createInitialSimulatorState,
  createPane,
  createSession,
  createWindow,
  getActiveSession,
  getActiveWindow,
  type TmuxPane,
  type SimulatorMode,
  type SimulatorState,
} from './model';

export type SplitDirection = 'vertical' | 'horizontal';
export type FocusDirection = 'left' | 'right' | 'up' | 'down';

export type SimulatorAction =
  | { type: 'SET_PREFIX_KEY'; payload: 'C-b' | 'C-a' }
  | { type: 'SET_MODE'; payload: SimulatorMode }
  | { type: 'SET_COMMAND_BUFFER'; payload: string }
  | { type: 'CLEAR_COMMAND_BUFFER' }
  | { type: 'ADD_MESSAGE'; payload: string }
  | { type: 'RECORD_ACTION'; payload: string }
  | { type: 'SPLIT_PANE'; payload: SplitDirection }
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

function withHistory(state: SimulatorState, actionId: string, message?: string): SimulatorState {
  return {
    ...state,
    actionHistory: [...state.actionHistory.slice(-49), actionId],
    messages: message ? [...state.messages.slice(-9), message] : state.messages,
  };
}

function moveFocus(panes: TmuxPane[], activePaneId: string, direction: FocusDirection) {
  if (panes.length <= 1) {
    return activePaneId;
  }

  const currentIndex = panes.findIndex((pane) => pane.id === activePaneId);
  if (currentIndex < 0) {
    return panes[0].id;
  }

  const offset = direction === 'left' || direction === 'up' ? -1 : 1;
  const nextIndex = (currentIndex + offset + panes.length) % panes.length;
  return panes[nextIndex].id;
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
        },
      };
    }

    case 'SET_COMMAND_BUFFER': {
      return {
        ...state,
        mode: {
          ...state.mode,
          commandBuffer: action.payload,
        },
      };
    }

    case 'CLEAR_COMMAND_BUFFER': {
      return {
        ...state,
        mode: {
          ...state.mode,
          commandBuffer: '',
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
        const layout = window.panes.length + 1 >= 3 ? 'grid' : action.payload;

        return {
          ...window,
          panes: [...window.panes, nextPane],
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

        return {
          ...window,
          panes: nextPanes,
          activePaneId: nextActivePane.id,
          layout: nextPanes.length === 1 ? 'single' : window.layout,
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

      if (command === 'new-window') {
        return simulatorReducer(state, { type: 'NEW_WINDOW' });
      }

      if (command === 'new-session') {
        return simulatorReducer(state, { type: 'NEW_SESSION' });
      }

      if (command === 'next-window') {
        return simulatorReducer(state, { type: 'NEXT_WINDOW' });
      }

      if (command === 'previous-window') {
        return simulatorReducer(state, { type: 'PREV_WINDOW' });
      }

      if (command === 'copy-mode') {
        return simulatorReducer(state, { type: 'ENTER_COPY_MODE' });
      }

      if (command === 'split-window -h') {
        return simulatorReducer(state, { type: 'SPLIT_PANE', payload: 'vertical' });
      }

      if (command === 'split-window -v') {
        return simulatorReducer(state, { type: 'SPLIT_PANE', payload: 'horizontal' });
      }

      if (command === 'kill-pane') {
        return simulatorReducer(state, { type: 'KILL_ACTIVE_PANE' });
      }

      if (command === 'select-pane -L') {
        return simulatorReducer(state, { type: 'FOCUS_PANE', payload: 'left' });
      }

      if (command === 'select-pane -R') {
        return simulatorReducer(state, { type: 'FOCUS_PANE', payload: 'right' });
      }

      if (command === 'select-pane -U') {
        return simulatorReducer(state, { type: 'FOCUS_PANE', payload: 'up' });
      }

      if (command === 'select-pane -D') {
        return simulatorReducer(state, { type: 'FOCUS_PANE', payload: 'down' });
      }

      return withHistory(state, 'sim.command.unhandled', `Unsupported command: ${command}`);
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
      const haystack =
        activePane?.terminal.lines.map((line) => line.text).join('\n').toLowerCase() ??
        activePane?.buffer.join('\n').toLowerCase() ??
        '';
      const query = action.payload.trim().toLowerCase();
      const found = query.length > 0 ? haystack.includes(query) : false;

      return withHistory(
        {
          ...state,
          mode: {
            ...state.mode,
            value: 'COPY_MODE',
            copyMode: {
              searchQuery: action.payload,
              searchExecuted: true,
              lastMatchFound: found,
            },
          },
        },
        'sim.copymode.search',
        found ? `Search match for "${action.payload}"` : `No match for "${action.payload}"`,
      );
    }

    case 'LOAD_SNAPSHOT': {
      return withHistory(action.payload, 'sim.snapshot.load', 'Snapshot restored');
    }

    case 'RESET': {
      return createInitialSimulatorState();
    }

    default:
      return state;
  }
}
