import type { TmuxConfigState } from './model';

export type TmuxConfigDirective =
  | { type: 'set-prefix'; value: 'C-a' | 'C-b'; line: number }
  | { type: 'set-mouse'; value: boolean; line: number }
  | { type: 'set-mode-keys'; value: 'vi' | 'emacs'; line: number }
  | { type: 'bind'; key: string; command: string; line: number }
  | { type: 'unbind'; key: string; line: number };

export type TmuxConfigParseError = {
  line: number;
  message: string;
};

export type TmuxConfigParseResult = {
  directives: TmuxConfigDirective[];
  errors: TmuxConfigParseError[];
};

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

function parseSetDirective(tokens: string[], line: number): TmuxConfigDirective | TmuxConfigParseError {
  if (tokens[0] !== 'set' || tokens[1] !== '-g') {
    return { line, message: 'unsupported set syntax' };
  }

  if (tokens[2] === 'prefix' && (tokens[3] === 'C-a' || tokens[3] === 'C-b')) {
    return { type: 'set-prefix', value: tokens[3], line };
  }

  if (tokens[2] === 'mouse' && (tokens[3] === 'on' || tokens[3] === 'off')) {
    return { type: 'set-mouse', value: tokens[3] === 'on', line };
  }

  return { line, message: 'unsupported set -g directive' };
}

function parseSetWindowDirective(tokens: string[], line: number): TmuxConfigDirective | TmuxConfigParseError {
  if (tokens[0] !== 'setw' || tokens[1] !== '-g') {
    return { line, message: 'unsupported setw syntax' };
  }

  if (tokens[2] === 'mode-keys' && (tokens[3] === 'vi' || tokens[3] === 'emacs')) {
    return { type: 'set-mode-keys', value: tokens[3], line };
  }

  return { line, message: 'unsupported setw -g directive' };
}

export function parseTmuxConfig(input: string): TmuxConfigParseResult {
  const directives: TmuxConfigDirective[] = [];
  const errors: TmuxConfigParseError[] = [];
  const lines = input.split('\n');

  lines.forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const tokens = tokenize(trimmed);
    if (tokens.length === 0) {
      return;
    }

    if (tokens[0] === 'set') {
      const parsed = parseSetDirective(tokens, line);
      if ('type' in parsed) {
        directives.push(parsed);
      } else {
        errors.push(parsed);
      }
      return;
    }

    if (tokens[0] === 'setw') {
      const parsed = parseSetWindowDirective(tokens, line);
      if ('type' in parsed) {
        directives.push(parsed);
      } else {
        errors.push(parsed);
      }
      return;
    }

    if (tokens[0] === 'bind' || tokens[0] === 'bind-key') {
      if (tokens.length < 3) {
        errors.push({ line, message: 'bind requires key and command' });
        return;
      }

      directives.push({
        type: 'bind',
        key: tokens[1],
        command: tokens.slice(2).join(' '),
        line,
      });
      return;
    }

    if (tokens[0] === 'unbind' || tokens[0] === 'unbind-key') {
      if (tokens.length < 2) {
        errors.push({ line, message: 'unbind requires key' });
        return;
      }

      directives.push({
        type: 'unbind',
        key: tokens[1],
        line,
      });
      return;
    }

    errors.push({ line, message: 'unsupported directive' });
  });

  return { directives, errors };
}

export function applyTmuxConfig(
  baseConfig: TmuxConfigState,
  directives: TmuxConfigDirective[],
): TmuxConfigState {
  let nextConfig: TmuxConfigState = {
    ...baseConfig,
    binds: { ...baseConfig.binds },
  };

  directives.forEach((directive) => {
    if (directive.type === 'set-prefix') {
      nextConfig = { ...nextConfig, prefixKey: directive.value };
      return;
    }

    if (directive.type === 'set-mouse') {
      nextConfig = { ...nextConfig, mouse: directive.value };
      return;
    }

    if (directive.type === 'set-mode-keys') {
      nextConfig = { ...nextConfig, modeKeys: directive.value };
      return;
    }

    if (directive.type === 'bind') {
      nextConfig = {
        ...nextConfig,
        binds: {
          ...nextConfig.binds,
          [directive.key]: directive.command,
        },
      };
      return;
    }

    if (directive.type === 'unbind') {
      const binds = { ...nextConfig.binds };
      delete binds[directive.key];
      nextConfig = {
        ...nextConfig,
        binds,
      };
    }
  });

  return nextConfig;
}
