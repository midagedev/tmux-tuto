import { describe, expect, it } from 'vitest';
import { createPane } from './model';
import { applyPaneLayout, resolveLayoutForPaneCount } from './layout';

describe('layout engine', () => {
  it('resolves layout by pane count and split direction', () => {
    expect(resolveLayoutForPaneCount(1, 'vertical')).toBe('single');
    expect(resolveLayoutForPaneCount(2, 'vertical')).toBe('vertical');
    expect(resolveLayoutForPaneCount(2, 'horizontal')).toBe('horizontal');
    expect(resolveLayoutForPaneCount(3, 'vertical')).toBe('grid');
  });

  it('applies grid geometry with stable pane dimensions', () => {
    const panes = [createPane('shell-a'), createPane('shell-a'), createPane('shell-a'), createPane('shell-a')];
    const grid = applyPaneLayout(panes, 'grid');

    expect(grid).toHaveLength(4);
    expect(grid.every((pane) => pane.width >= 10 && pane.height >= 5)).toBe(true);
    expect(new Set(grid.map((pane) => `${pane.x},${pane.y}`)).size).toBe(4);
  });
});
