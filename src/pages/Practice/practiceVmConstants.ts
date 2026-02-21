import type { LessonFilter } from './lessonProgress';

export const QUICK_COMMANDS = [
  {
    label: '새 세션 생성',
    command: 'tmux new-session -d -s lesson && tmux list-sessions',
  },
  {
    label: '새 윈도우 생성',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux new-window -t lesson -n win2; tmux list-windows -t lesson',
  },
  {
    label: 'Pane 분할',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux split-window -t lesson; tmux list-panes -t lesson',
  },
  {
    label: '다음 윈도우',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux next-window -t lesson; tmux display-message -p "window #{window_index}"',
  },
  {
    label: 'Copy Search 성공',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux copy-mode -t lesson:0.0; tmux send-keys -t lesson:0.0 -X search-backward "bin"; printf "[[TMUXWEB_PROBE:search:1]]\\n[[TMUXWEB_PROBE:searchMatched:1]]\\n" > /dev/ttyS1',
  },
  {
    label: 'Copy Search 실패',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux copy-mode -t lesson:0.0; tmux send-keys -t lesson:0.0 -X search-backward "__TMUXWEB_NOT_FOUND__"; printf "[[TMUXWEB_PROBE:search:1]]\\n[[TMUXWEB_PROBE:searchMatched:0]]\\n" > /dev/ttyS1',
  },
  {
    label: '레이아웃 변경',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux select-layout -t lesson:0 even-horizontal; tmux display-message -p "#{window_layout}"',
  },
  {
    label: 'Pane 줌 토글',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux resize-pane -t lesson:0.0 -Z; tmux display-message -p "#{window_zoomed_flag}"',
  },
  {
    label: 'Pane Sync ON',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux set-window-option -t lesson:0 synchronize-panes on; tmux show-window-options -t lesson:0 -v synchronize-panes',
  },
] as const;

export const LEARNING_PATH_ENTRY_LESSON = 'hello-tmux';

export const LESSON_FILTER_OPTIONS: Array<{ value: LessonFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'continue', label: '이어하기' },
  { value: 'incomplete', label: '미완료' },
  { value: 'completed', label: '완료' },
];
