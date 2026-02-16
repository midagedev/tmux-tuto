export type CheatsheetItem = {
  id: string;
  title: string;
  contentType: 'shortcut' | 'command' | 'playbook';
  intentTags: string[];
  shortcut?: string;
  command?: string;
  description: string;
  examples: string[];
  relatedActions: string[];
  difficulty: 'beginner' | 'daily' | 'advanced';
  playbookSlug?: string;
};

export const CHEATSHEET_ITEMS: CheatsheetItem[] = [
  {
    id: 'cs-split-vertical',
    title: '패인 세로 분할',
    contentType: 'shortcut',
    intentTags: ['split', 'pane', 'vertical'],
    shortcut: 'prefix + %',
    description: '현재 패인을 좌우로 분할합니다.',
    examples: ['로그와 쉘을 동시에 보기'],
    relatedActions: ['sim.pane.split.vertical'],
    difficulty: 'beginner',
  },
  {
    id: 'cs-split-horizontal',
    title: '패인 가로 분할',
    contentType: 'shortcut',
    intentTags: ['split', 'pane', 'horizontal'],
    shortcut: 'prefix + "',
    description: '현재 패인을 상하로 분할합니다.',
    examples: ['상단 빌드, 하단 로그'],
    relatedActions: ['sim.pane.split.horizontal'],
    difficulty: 'beginner',
  },
  {
    id: 'cs-window-new',
    title: '새 윈도우 생성',
    contentType: 'shortcut',
    intentTags: ['window', 'new'],
    shortcut: 'prefix + c',
    description: '새 tmux window를 생성합니다.',
    examples: ['서비스별 window 분리'],
    relatedActions: ['sim.window.new'],
    difficulty: 'beginner',
  },
  {
    id: 'cs-window-next',
    title: '다음 윈도우 이동',
    contentType: 'shortcut',
    intentTags: ['window', 'next', 'navigation'],
    shortcut: 'prefix + n',
    description: '다음 window로 이동합니다.',
    examples: ['모니터링 window 순환'],
    relatedActions: ['sim.window.next'],
    difficulty: 'daily',
  },
  {
    id: 'cs-copy-mode',
    title: 'copy-mode 진입',
    contentType: 'shortcut',
    intentTags: ['copy-mode', 'search'],
    shortcut: 'prefix + [',
    description: '스크롤/검색/선택 복사를 위한 copy-mode로 들어갑니다.',
    examples: ['로그 검색 후 복사'],
    relatedActions: ['sim.copymode.enter'],
    difficulty: 'advanced',
  },
  {
    id: 'cs-command-mode',
    title: 'command mode 진입',
    contentType: 'shortcut',
    intentTags: ['command', 'colon'],
    shortcut: 'prefix + :',
    description: 'tmux 명령을 직접 실행합니다.',
    examples: ['new-window', 'split-window -h'],
    relatedActions: ['sim.command.execute'],
    difficulty: 'advanced',
  },
  {
    id: 'cs-session-main',
    title: '세션 유지 시작',
    contentType: 'command',
    intentTags: ['session', 'persistent-session', 'detach-attach'],
    command: 'tmux new -As main',
    description: '세션이 없으면 생성, 있으면 재사용합니다.',
    examples: ['원격 서버 접속 직후 실행'],
    relatedActions: ['sim.session.new'],
    difficulty: 'daily',
  },
  {
    id: 'cs-recommended-config',
    title: '권장 tmux.conf',
    contentType: 'playbook',
    intentTags: ['tmux.conf', 'config', 'recommended'],
    description: '기본 생산성을 높이는 tmux.conf 템플릿입니다.',
    examples: ['mouse on', 'base-index 1'],
    relatedActions: [],
    difficulty: 'daily',
    playbookSlug: 'recommended-config',
  },
  {
    id: 'cs-session-persistence',
    title: '세션 유지 플레이북',
    contentType: 'playbook',
    intentTags: ['keep session alive', 'persistent-session', 'detach-attach'],
    description: 'detach/attach 루틴으로 작업 컨텍스트를 유지합니다.',
    examples: ['tmux ls', 'tmux attach -t main'],
    relatedActions: [],
    difficulty: 'daily',
    playbookSlug: 'session-persistence',
  },
  {
    id: 'cs-tailscale-ssh',
    title: 'Tailscale SSH 원격',
    contentType: 'playbook',
    intentTags: ['tailscale', 'remote-ssh', 'secure-remote'],
    description: 'Tailscale 기반 원격 접속 후 tmux를 이어서 작업합니다.',
    examples: ['tailscale status', 'tailscale ssh user@host'],
    relatedActions: [],
    difficulty: 'advanced',
    playbookSlug: 'tailscale-ssh-workflow',
  },
];
