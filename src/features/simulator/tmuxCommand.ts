import type { SimulatorAction } from './reducer';
type CommandParser = (args: string[]) => SimulatorAction | null;
function tokenize(input: string) {
    const tokens: string[] = [];
    const matcher = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match: RegExpExecArray | null;
    match = matcher.exec(input);
    while (match) {
        tokens.push(match[1] ?? match[2] ?? match[3]);
        match = matcher.exec(input);
    }
    return tokens;
}
const NO_ARG_PARSERS: Record<string, SimulatorAction> = {
    'new-window': { type: 'NEW_WINDOW' },
    'new-session': { type: 'NEW_SESSION' },
    'next-window': { type: 'NEXT_WINDOW' },
    'previous-window': { type: 'PREV_WINDOW' },
    'kill-pane': { type: 'KILL_ACTIVE_PANE' },
    'copy-mode': { type: 'ENTER_COPY_MODE' },
};
const commandRegistry: Record<string, CommandParser> = {
    ...Object.fromEntries(Object.entries(NO_ARG_PARSERS).map(([name, action]) => [
        name,
        (args: string[]) => (args.length === 0 ? action : null),
    ])),
    'split-window': (args) => {
        if (args.length !== 1) {
            return null;
        }
        if (args[0] === '-h') {
            return { type: 'SPLIT_PANE', payload: 'vertical' };
        }
        if (args[0] === '-v') {
            return { type: 'SPLIT_PANE', payload: 'horizontal' };
        }
        return null;
    },
    'select-pane': (args) => {
        if (args.length !== 1) {
            return null;
        }
        if (args[0] === '-L') {
            return { type: 'FOCUS_PANE', payload: 'left' };
        }
        if (args[0] === '-R') {
            return { type: 'FOCUS_PANE', payload: 'right' };
        }
        if (args[0] === '-U') {
            return { type: 'FOCUS_PANE', payload: 'up' };
        }
        if (args[0] === '-D') {
            return { type: 'FOCUS_PANE', payload: 'down' };
        }
        return null;
    },
};
export function parseTmuxCommand(input: string): SimulatorAction | null {
    const tokens = tokenize(input.trim());
    if (tokens.length === 0) {
        return null;
    }
    const [commandName, ...args] = tokens;
    const parser = commandRegistry[commandName];
    if (!parser) {
        return null;
    }
    return parser(args);
}
