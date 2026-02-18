import type { KeyboardEvent, WheelEvent } from 'react';
import type { TmuxPane } from '../../features/simulator/model';
import { getViewportLines } from '../../features/simulator/terminalBuffer';

type PaneViewProps = {
  pane: TmuxPane;
  isActive: boolean;
  mouseEnabled: boolean;
  copyMatchLineSet: ReadonlySet<number>;
  activeMatchLine: number;
  onFocusPane: (paneId: string) => void;
  onScrollPane: (paneId: string, delta: number) => void;
};

export function PaneView({
  pane,
  isActive,
  mouseEnabled,
  copyMatchLineSet,
  activeMatchLine,
  onFocusPane,
  onScrollPane,
}: PaneViewProps) {
  const viewportLines = getViewportLines(pane.terminal);
  const viewportStart = pane.terminal.viewportTop;

  const handleFocus = () => {
    onFocusPane(pane.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onScrollPane(pane.id, 2);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onScrollPane(pane.id, -2);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFocus();
    }
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!mouseEnabled) {
      return;
    }

    event.preventDefault();
    const delta = event.deltaY < 0 ? 2 : -2;
    onScrollPane(pane.id, delta);
  };

  return (
    <div
      className={`sim-pane-card${isActive ? ' is-active' : ''}`}
      data-active={isActive ? 'true' : 'false'}
      aria-label={`Pane ${pane.id}${isActive ? ' active' : ''}, x ${pane.x} y ${pane.y} width ${pane.width} height ${pane.height}`}
      onClick={() => {
        if (!mouseEnabled) {
          return;
        }
        handleFocus();
      }}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      role="button"
      tabIndex={0}
    >
      <div className="sim-pane-head">
        <strong>{isActive ? '●' : '○'} {pane.id}</strong>
        <span>
          {pane.width}x{pane.height}
        </span>
      </div>
      <div className={`sim-pane-body${isActive ? ' is-active' : ''}`}>
        <div className="sim-pane-geometry">x:{pane.x} y:{pane.y} w:{pane.width} h:{pane.height}</div>
        {viewportLines.length === 0 ? (
          <div className="sim-pane-line">(empty)</div>
        ) : (
          viewportLines.map((line, index) => {
            const lineIndex = viewportStart + index;
            const isMatch = isActive && copyMatchLineSet.has(lineIndex);
            const isActiveMatch = isMatch && lineIndex === activeMatchLine;

            return (
              <div
                key={line.id}
                className={`sim-pane-line${isMatch ? ' is-match' : ''}${isActiveMatch ? ' is-active-match' : ''}`}
              >
                {line.text || ' '}
              </div>
            );
          })
        )}
      </div>
      <div className="sim-pane-foot" data-scroll-top={pane.terminal.viewportTop}>
        scrollTop: {pane.terminal.viewportTop}
      </div>
    </div>
  );
}
