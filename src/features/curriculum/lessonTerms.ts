import type { AppLesson, AppMission } from './contentSchema';

export type LessonTerm = {
  id: string;
  title: string;
  aliases: string[];
  description: string;
};

export const DEFAULT_TERM_GLOSSARY: LessonTerm[] = [
  {
    id: 'session',
    title: 'Session',
    aliases: ['session', '세션'],
    description: '작업 컨텍스트를 유지하는 최상위 단위입니다. SSH가 끊겨도 다시 붙어 이어서 작업할 수 있습니다.',
  },
  {
    id: 'window',
    title: 'Window',
    aliases: ['window', '윈도우'],
    description: '세션 안의 탭 단위 작업 공간입니다. 서비스/역할별로 분리해 전환합니다.',
  },
  {
    id: 'pane',
    title: 'Pane',
    aliases: ['pane', '패인'],
    description: '한 윈도우를 분할한 터미널 영역입니다. 코드/로그/테스트를 병렬로 볼 때 사용합니다.',
  },
  {
    id: 'prefix',
    title: 'Prefix Key',
    aliases: ['prefix', 'ctrl+b', 'ctrl+a'],
    description: 'tmux 단축키 입력의 시작 키입니다. 기본값은 `Ctrl+b`입니다.',
  },
  {
    id: 'detach-attach',
    title: 'Detach / Attach',
    aliases: ['detach', 'attach', '분리', '재접속'],
    description: '세션에서 빠져나왔다가 다시 붙는 동작입니다. 세션 복구 루틴의 핵심입니다.',
  },
  {
    id: 'copy-mode',
    title: 'Copy Mode',
    aliases: ['copy-mode', 'copy mode', '검색', 'scroll'],
    description: '스크롤, 검색, 선택 복사를 위한 모드입니다. 긴 로그 탐색에 사용합니다.',
  },
  {
    id: 'command-mode',
    title: 'Command Mode',
    aliases: ['command mode', 'command-mode', 'command-prompt', 'choose-tree'],
    description: 'tmux 명령을 직접 실행하는 모드입니다. 복합 동작 자동화에 유용합니다.',
  },
  {
    id: 'layout',
    title: 'Layout',
    aliases: ['layout', '레이아웃', 'resize', 'split'],
    description: '패인 배치를 의미합니다. 작업 성격에 맞춰 분할/크기/포커스를 조정합니다.',
  },
];

export function resolveLessonTerms(lesson: AppLesson, missions: AppMission[], termGlossary: LessonTerm[] | null) {
  const corpus = [
    lesson.title,
    lesson.overview ?? '',
    lesson.goal ?? '',
    ...lesson.objectives,
    ...(lesson.successCriteria ?? []),
    ...(lesson.failureStates ?? []),
    ...missions.flatMap((mission) => [mission.title, ...mission.hints]),
  ]
    .join(' ')
    .toLowerCase();

  const source = termGlossary ?? DEFAULT_TERM_GLOSSARY;
  return source.filter((term) => term.aliases.some((alias) => corpus.includes(alias.toLowerCase()))).slice(0, 6);
}
