import type { PseudoFileSystem, ShellSession } from './model';
export type ShellCommandResult = {
    handled: boolean;
    shellSession: ShellSession;
    outputLines: string[];
    clearScreen: boolean;
};
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
    return `/${segments.join('/')}`.replace(/\/+$/, '') || '/';
}
function resolvePath(cwd: string, target: string) {
    if (!target || target === '.') {
        return cwd;
    }
    if (target.startsWith('/')) {
        return normalizePath(target);
    }
    return normalizePath(`${cwd}/${target}`);
}
function getParentPath(path: string) {
    if (path === '/') {
        return '/';
    }
    const normalized = normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash <= 0) {
        return '/';
    }
    return normalized.slice(0, lastSlash);
}
function getBaseName(path: string) {
    if (path === '/') {
        return '/';
    }
    const normalized = normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    return normalized.slice(lastSlash + 1);
}
function tokenize(command: string) {
    const tokens: string[] = [];
    const matcher = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match: RegExpExecArray | null;
    match = matcher.exec(command);
    while (match) {
        tokens.push(match[1] ?? match[2] ?? match[3]);
        match = matcher.exec(command);
    }
    return tokens;
}
function asSortedUnique(items: Iterable<string>) {
    return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}
function ensureDirectory(fs: PseudoFileSystem, path: string) {
    const normalized = normalizePath(path);
    const dirs = new Set(fs.directories);
    dirs.add('/');
    let current = '';
    normalized
        .split('/')
        .filter(Boolean)
        .forEach((segment) => {
        current = `${current}/${segment}`;
        dirs.add(current);
    });
    return asSortedUnique(dirs);
}
function listDirectory(fs: PseudoFileSystem, path: string) {
    const normalized = normalizePath(path);
    const children = new Set<string>();
    fs.directories.forEach((dir) => {
        const parent = getParentPath(dir);
        if (dir !== normalized && parent === normalized) {
            children.add(getBaseName(dir));
        }
    });
    Object.keys(fs.files).forEach((filePath) => {
        const parent = getParentPath(filePath);
        if (parent === normalized) {
            children.add(getBaseName(filePath));
        }
    });
    return asSortedUnique(children);
}
function hasDirectory(fs: PseudoFileSystem, path: string) {
    const normalized = normalizePath(path);
    return fs.directories.includes(normalized);
}
function hasFile(fs: PseudoFileSystem, path: string) {
    const normalized = normalizePath(path);
    return Object.prototype.hasOwnProperty.call(fs.files, normalized);
}
function withSession(session: ShellSession, next: Partial<ShellSession>): ShellSession {
    return {
        ...session,
        ...next,
    };
}
function toContentLines(content: string) {
    const lines = content.split('\n');
    if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines;
}
function output(session: ShellSession, outputLines: string[], overrides?: Partial<ShellCommandResult>): ShellCommandResult {
    return {
        handled: true,
        shellSession: session,
        outputLines,
        clearScreen: false,
        ...overrides,
    };
}
export function executeShellCommand(shellSession: ShellSession, rawCommand: string): ShellCommandResult {
    const tokens = tokenize(rawCommand);
    if (tokens.length === 0) {
        return output(shellSession, []);
    }
    const [command, ...args] = tokens;
    const fs = shellSession.fileSystem;
    const cwd = shellSession.workingDirectory;
    if (command === 'pwd') {
        return output(shellSession, [cwd]);
    }
    if (command === 'ls') {
        const target = resolvePath(cwd, args[0] ?? '.');
        if (hasFile(fs, target)) {
            return output(shellSession, [getBaseName(target)]);
        }
        if (!hasDirectory(fs, target)) {
            return output(shellSession, [`ls: cannot access '${args[0] ?? target}'`]);
        }
        const children = listDirectory(fs, target);
        return output(shellSession, [children.join('  ')]);
    }
    if (command === 'cd') {
        const target = resolvePath(cwd, args[0] ?? '/home/user');
        if (!hasDirectory(fs, target)) {
            return output(shellSession, [`cd: no such directory: ${args[0] ?? target}`]);
        }
        return output(withSession(shellSession, { workingDirectory: target }), []);
    }
    if (command === 'mkdir') {
        if (args.length === 0) {
            return output(shellSession, ['mkdir: missing operand']);
        }
        let directories = fs.directories;
        args.forEach((entry) => {
            const target = resolvePath(cwd, entry);
            directories = ensureDirectory({ ...fs, directories }, target);
        });
        return output(withSession(shellSession, { fileSystem: { ...fs, directories } }), []);
    }
    if (command === 'touch') {
        if (args.length === 0) {
            return output(shellSession, ['touch: missing file operand']);
        }
        let directories = fs.directories;
        const files = { ...fs.files };
        const errors: string[] = [];
        args.forEach((entry) => {
            const filePath = resolvePath(cwd, entry);
            const parentPath = getParentPath(filePath);
            if (!hasDirectory({ ...fs, directories, files }, parentPath)) {
                errors.push(`touch: cannot touch '${entry}': no such directory`);
                return;
            }
            directories = ensureDirectory({ ...fs, directories, files }, parentPath);
            files[filePath] = files[filePath] ?? '';
        });
        return output(withSession(shellSession, { fileSystem: { directories, files } }), errors);
    }
    if (command === 'cat') {
        if (args.length === 0) {
            return output(shellSession, ['cat: missing file operand']);
        }
        const lines: string[] = [];
        args.forEach((entry) => {
            const filePath = resolvePath(cwd, entry);
            if (!hasFile(fs, filePath)) {
                lines.push(`cat: ${entry}: No such file`);
                return;
            }
            const content = fs.files[filePath] ?? '';
            lines.push(...toContentLines(content));
        });
        return output(shellSession, lines);
    }
    if (command === 'echo') {
        const redirectIndex = args.findIndex((token) => token === '>' || token === '>>');
        if (redirectIndex >= 0) {
            const operator = args[redirectIndex];
            const targetName = args[redirectIndex + 1];
            if (!targetName) {
                return output(shellSession, ['echo: redirection target is missing']);
            }
            const text = args.slice(0, redirectIndex).join(' ');
            const filePath = resolvePath(cwd, targetName);
            const parentPath = getParentPath(filePath);
            if (!hasDirectory(fs, parentPath)) {
                return output(shellSession, [`echo: cannot write '${targetName}': no such directory`]);
            }
            const prev = fs.files[filePath] ?? '';
            const nextContent = operator === '>>' ? `${prev}${text}\n` : `${text}\n`;
            return output(withSession(shellSession, {
                fileSystem: {
                    ...fs,
                    files: {
                        ...fs.files,
                        [filePath]: nextContent,
                    },
                },
            }), []);
        }
        return output(shellSession, [args.join(' ')]);
    }
    if (command === 'grep') {
        if (args.length < 2) {
            return output(shellSession, ['grep: usage: grep <pattern> <file>']);
        }
        const [pattern, targetName] = args;
        const filePath = resolvePath(cwd, targetName);
        if (!hasFile(fs, filePath)) {
            return output(shellSession, [`grep: ${targetName}: No such file`]);
        }
        const matches = toContentLines(fs.files[filePath] ?? '')
            .filter((line) => line.includes(pattern));
        return output(shellSession, matches.length > 0 ? matches : ['(no matches)']);
    }
    if (command === 'tail') {
        const isFollow = args[0] === '-f';
        const hasCount = args[0] === '-n';
        let count = 10;
        let targetName = args[0];
        if (isFollow) {
            targetName = args[1];
        }
        if (hasCount) {
            const parsed = Number(args[1]);
            count = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10;
            targetName = args[2];
        }
        if (!targetName) {
            return output(shellSession, ['tail: usage: tail [-n N|-f] <file>']);
        }
        const filePath = resolvePath(cwd, targetName);
        if (!hasFile(fs, filePath)) {
            return output(shellSession, [`tail: ${targetName}: No such file`]);
        }
        const lines = toContentLines(fs.files[filePath] ?? '');
        const outputLines = lines.slice(-count);
        if (isFollow) {
            outputLines.push('[simulated] following output...');
        }
        return output(shellSession, outputLines);
    }
    if (command === 'clear') {
        return output(shellSession, [], { clearScreen: true });
    }
    if (command === 'history') {
        const lines = shellSession.history.map((entry, index) => `${index + 1}  ${entry}`);
        return output(shellSession, lines);
    }
    if (command === 'help') {
        return output(shellSession, [
            'Available commands:',
            'pwd, ls, cd, mkdir, touch, cat, echo, grep, tail, clear, history, help',
            'tmux <subcommand>',
        ]);
    }
    return {
        handled: false,
        shellSession,
        outputLines: [],
        clearScreen: false,
    };
}
