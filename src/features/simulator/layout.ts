import type { SimulatorLayout, TmuxPane } from './model';

const VIEW_WIDTH = 120;
const VIEW_HEIGHT = 40;

function withGeometry(pane: TmuxPane, x: number, y: number, width: number, height: number): TmuxPane {
  return {
    ...pane,
    x,
    y,
    width: Math.max(10, width),
    height: Math.max(5, height),
  };
}

function layoutSingle(panes: TmuxPane[]) {
  return panes.map((pane, index) =>
    withGeometry(pane, 0, 0, VIEW_WIDTH, VIEW_HEIGHT - index),
  );
}

function layoutVertical(panes: TmuxPane[]) {
  const columnWidth = Math.floor(VIEW_WIDTH / panes.length);
  let currentX = 0;
  return panes.map((pane, index) => {
    const isLast = index === panes.length - 1;
    const width = isLast ? VIEW_WIDTH - currentX : columnWidth;
    const next = withGeometry(pane, currentX, 0, width, VIEW_HEIGHT);
    currentX += width;
    return next;
  });
}

function layoutHorizontal(panes: TmuxPane[]) {
  const rowHeight = Math.floor(VIEW_HEIGHT / panes.length);
  let currentY = 0;
  return panes.map((pane, index) => {
    const isLast = index === panes.length - 1;
    const height = isLast ? VIEW_HEIGHT - currentY : rowHeight;
    const next = withGeometry(pane, 0, currentY, VIEW_WIDTH, height);
    currentY += height;
    return next;
  });
}

function layoutGrid(panes: TmuxPane[]) {
  const columns = Math.ceil(Math.sqrt(panes.length));
  const rows = Math.ceil(panes.length / columns);
  const baseWidth = Math.floor(VIEW_WIDTH / columns);
  const baseHeight = Math.floor(VIEW_HEIGHT / rows);

  return panes.map((pane, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = baseWidth * column;
    const y = baseHeight * row;
    const width = column === columns - 1 ? VIEW_WIDTH - x : baseWidth;
    const height = row === rows - 1 ? VIEW_HEIGHT - y : baseHeight;
    return withGeometry(pane, x, y, width, height);
  });
}

export function resolveLayoutForPaneCount(
  paneCount: number,
  requestedSplit: 'vertical' | 'horizontal',
): SimulatorLayout {
  if (paneCount <= 1) {
    return 'single';
  }

  if (paneCount === 2) {
    return requestedSplit;
  }

  return 'grid';
}

export function applyPaneLayout(panes: TmuxPane[], layout: SimulatorLayout) {
  if (panes.length <= 1) {
    return layoutSingle(panes);
  }

  switch (layout) {
    case 'vertical':
      return layoutVertical(panes);
    case 'horizontal':
      return layoutHorizontal(panes);
    case 'grid':
      return layoutGrid(panes);
    case 'single':
    default:
      return layoutSingle(panes);
  }
}
