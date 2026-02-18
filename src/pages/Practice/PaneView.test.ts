import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { appendOutput, createTerminalBuffer } from '../../features/simulator/terminalBuffer';
import type { TmuxPane } from '../../features/simulator/model';
import { PaneView } from './PaneView';

function buildPane(overrides?: Partial<TmuxPane>): TmuxPane {
  return {
    id: 'pane-1',
    title: 'shell',
    shellSessionId: 'shell-1',
    buffer: [],
    terminal: createTerminalBuffer({ width: 40, height: 4, scrollbackLimit: 30 }),
    x: 4,
    y: 2,
    width: 50,
    height: 20,
    ...overrides,
  };
}

describe('PaneView', () => {
  it('renders active border, geometry overlay and active match line', () => {
    const pane = buildPane({
      terminal: appendOutput(createTerminalBuffer({ width: 40, height: 4, scrollbackLimit: 30 }), 'error line\nok'),
    });

    const html = renderToStaticMarkup(
      createElement(PaneView, {
        pane,
        isActive: true,
        mouseEnabled: true,
        copyMatchLineSet: new Set([0]),
        activeMatchLine: 0,
        onFocusPane: () => undefined,
        onScrollPane: () => undefined,
      }),
    );

    expect(html).toContain('sim-pane-card is-active');
    expect(html).toContain('sim-pane-body is-active');
    expect(html).toContain('sim-pane-geometry');
    expect(html).toContain('x:4 y:2 w:50 h:20');
    expect(html).toContain('sim-pane-line is-match is-active-match');
  });

  it('shows empty placeholder when viewport has no lines', () => {
    const pane = buildPane();

    const html = renderToStaticMarkup(
      createElement(PaneView, {
        pane,
        isActive: false,
        mouseEnabled: false,
        copyMatchLineSet: new Set<number>(),
        activeMatchLine: -1,
        onFocusPane: () => undefined,
        onScrollPane: () => undefined,
      }),
    );

    expect(html).toContain('(empty)');
    expect(html).toContain('data-active="false"');
  });
});
