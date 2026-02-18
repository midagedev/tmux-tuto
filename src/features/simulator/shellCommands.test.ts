import { describe, expect, it } from 'vitest';
import { createShellSession } from './model';
import { executeShellCommand } from './shellCommands';

describe('shellCommands parser', () => {
  it('handles path operations with normalized relative paths', () => {
    let session = createShellSession();

    session = executeShellCommand(session, 'mkdir notes').shellSession;
    session = executeShellCommand(session, 'touch notes/todo.txt').shellSession;
    session = executeShellCommand(session, 'echo "hello world" > notes/todo.txt').shellSession;

    const pwdResult = executeShellCommand(session, 'pwd');
    const catResult = executeShellCommand(session, 'cat notes/./todo.txt');

    expect(pwdResult.outputLines).toEqual(['/home/user']);
    expect(catResult.outputLines).toEqual(['hello world']);
    expect(session.fileSystem.files['/home/user/notes/todo.txt']).toBe('hello world\n');
  });

  it('supports append redirection and quoted string tokenization', () => {
    let session = createShellSession();

    session = executeShellCommand(session, 'echo "line one" > logs/custom.log').shellSession;
    session = executeShellCommand(session, "echo 'line two' >> logs/custom.log").shellSession;

    const catResult = executeShellCommand(session, 'cat logs/custom.log');
    expect(catResult.outputLines).toEqual(['line one', 'line two']);
  });

  it('supports grep and tail command variants', () => {
    const session = createShellSession();

    const grepMatch = executeShellCommand(session, 'grep error logs/app.log');
    const grepNoMatch = executeShellCommand(session, 'grep missing logs/app.log');
    const grepInvalid = executeShellCommand(session, 'grep');
    const tailCount = executeShellCommand(session, 'tail -n 2 logs/app.log');
    const tailFollow = executeShellCommand(session, 'tail -f logs/app.log');

    expect(grepMatch.outputLines).toEqual(['error sample line']);
    expect(grepNoMatch.outputLines).toEqual(['(no matches)']);
    expect(grepInvalid.outputLines).toEqual(['grep: usage: grep <pattern> <file>']);
    expect(tailCount.outputLines).toEqual(['worker ready', 'error sample line']);
    expect(tailFollow.outputLines[tailFollow.outputLines.length - 1]).toBe('[simulated] following output...');
  });

  it('returns clearScreen flag for clear and false handled for unknown command', () => {
    const session = createShellSession();

    const clearResult = executeShellCommand(session, 'clear');
    const unknownResult = executeShellCommand(session, 'whoami');

    expect(clearResult.clearScreen).toBe(true);
    expect(clearResult.handled).toBe(true);
    expect(unknownResult.handled).toBe(false);
    expect(unknownResult.outputLines).toEqual([]);
  });
});
