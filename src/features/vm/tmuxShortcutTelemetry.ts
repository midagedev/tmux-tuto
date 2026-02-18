export type TmuxShortcutTelemetryState = {
    prefixPending: boolean;
    prefixEscapeBuffer: string | null;
    copySearchPending: boolean;
};
export type TmuxShortcutSyntheticCommand = {
    command: string;
    shortcutAction: string;
};
export type TmuxShortcutTelemetry = {
    syntheticCommands: TmuxShortcutSyntheticCommand[];
    shouldProbeSearch: boolean;
};
function isPrefixTriggerKey(char: string) {
    return char === '\u0001' || char === '\u0002';
}
function isEscapeSequenceTerminator(char: string) {
    return char >= '@' && char <= '~';
}
function mapPrefixTokenToCommand(token: string): TmuxShortcutSyntheticCommand | null {
    switch (token) {
        case '%':
            return { command: 'tmux split-window -h', shortcutAction: 'sim.shortcut.pane.split.vertical' };
        case '"':
            return { command: 'tmux split-window -v', shortcutAction: 'sim.shortcut.pane.split.horizontal' };
        case 'c':
            return { command: 'tmux new-window', shortcutAction: 'sim.shortcut.window.new' };
        case 'n':
            return { command: 'tmux next-window', shortcutAction: 'sim.shortcut.window.next' };
        case 'p':
            return { command: 'tmux previous-window', shortcutAction: 'sim.shortcut.window.prev' };
        case 'd':
            return { command: 'tmux detach-client', shortcutAction: 'sim.shortcut.session.detach' };
        case '[':
            return { command: 'tmux copy-mode', shortcutAction: 'sim.shortcut.copy-mode.enter' };
        case ':':
            return { command: 'tmux command-prompt -p "cmd"', shortcutAction: 'sim.shortcut.command.prompt' };
        case 'w':
            return { command: 'tmux choose-tree -Z; tmux list-windows', shortcutAction: 'sim.shortcut.choose.tree' };
        case 'h':
            return { command: 'tmux select-pane -L', shortcutAction: 'sim.shortcut.pane.select.left' };
        case 'j':
            return { command: 'tmux select-pane -D', shortcutAction: 'sim.shortcut.pane.select.down' };
        case 'k':
            return { command: 'tmux select-pane -U', shortcutAction: 'sim.shortcut.pane.select.up' };
        case 'l':
            return { command: 'tmux select-pane -R', shortcutAction: 'sim.shortcut.pane.select.right' };
        case 'H':
            return { command: 'tmux resize-pane -L 5', shortcutAction: 'sim.shortcut.pane.resize.left' };
        case 'J':
            return { command: 'tmux resize-pane -D 3', shortcutAction: 'sim.shortcut.pane.resize.down' };
        case 'K':
            return { command: 'tmux resize-pane -U 3', shortcutAction: 'sim.shortcut.pane.resize.up' };
        case 'L':
            return { command: 'tmux resize-pane -R 5', shortcutAction: 'sim.shortcut.pane.resize.right' };
        case '\u001b[A':
        case '\u001bOA':
            return { command: 'tmux select-pane -U', shortcutAction: 'sim.shortcut.pane.select.up' };
        case '\u001b[B':
        case '\u001bOB':
            return { command: 'tmux select-pane -D', shortcutAction: 'sim.shortcut.pane.select.down' };
        case '\u001b[C':
        case '\u001bOC':
            return { command: 'tmux select-pane -R', shortcutAction: 'sim.shortcut.pane.select.right' };
        case '\u001b[D':
        case '\u001bOD':
            return { command: 'tmux select-pane -L', shortcutAction: 'sim.shortcut.pane.select.left' };
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
export function parseTmuxShortcutTelemetry(input: string, state: TmuxShortcutTelemetryState, options: {
    inCopyMode: boolean;
}): TmuxShortcutTelemetry {
    const syntheticCommands: TmuxShortcutSyntheticCommand[] = [];
    let shouldProbeSearch = false;
    for (const char of input) {
        if (state.prefixEscapeBuffer !== null) {
            state.prefixEscapeBuffer += char;
            const shouldFinalizeEscapeToken = isEscapeSequenceTerminator(char) &&
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
