import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import type V86 from 'v86';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import { useProgressStore } from '../../features/progress/progressStore';
import {
  evaluateMissionWithVmSnapshot,
  extractCommandFromPromptLine,
  parseProbeMetricFromLine,
  parseTmuxActionsFromCommand,
  type VmProbeMetric,
} from '../../features/vm/missionBridge';

type VmStatus = 'idle' | 'booting' | 'running' | 'stopped' | 'error';

type VmMetricState = {
  sessionCount: number | null;
  windowCount: number | null;
  paneCount: number | null;
  modeIs: string | null;
  searchExecuted: boolean | null;
  searchMatchFound: boolean | null;
};

type CelebrationState = {
  kind: 'mission' | 'lesson';
  message: string;
  detail: string;
};

const MAX_HISTORY = 240;
const MAX_DEBUG_LINES = 220;

const PROBE_COMMAND =
  'TMUXWEB_TMUX=0; tmux -V >/dev/null 2>&1 && TMUXWEB_TMUX=1; ' +
  'TMUXWEB_SESSION=-1; TMUXWEB_WINDOW=-1; TMUXWEB_PANE=-1; TMUXWEB_MODE=0; ' +
  'if [ "$TMUXWEB_TMUX" -eq 1 ]; then ' +
  'TMUXWEB_SESSION=$(tmux list-sessions 2>/dev/null | wc -l | tr -d " "); ' +
  'TMUXWEB_WINDOW=$(tmux list-windows 2>/dev/null | wc -l | tr -d " "); ' +
  'TMUXWEB_PANE=$(tmux list-panes 2>/dev/null | wc -l | tr -d " "); ' +
  'TMUXWEB_MODE=$(tmux display-message -p "#{?pane_in_mode,1,0}" 2>/dev/null || echo 0); ' +
  'fi; ' +
  'echo "[[TMUXWEB_PROBE:tmux:${TMUXWEB_TMUX}]]"; ' +
  'echo "[[TMUXWEB_PROBE:session:${TMUXWEB_SESSION}]]"; ' +
  'echo "[[TMUXWEB_PROBE:window:${TMUXWEB_WINDOW}]]"; ' +
  'echo "[[TMUXWEB_PROBE:pane:${TMUXWEB_PANE}]]"; ' +
  'echo "[[TMUXWEB_PROBE:mode:${TMUXWEB_MODE}]]"';

const QUICK_COMMANDS = [
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
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux copy-mode -t lesson:0.0; tmux send-keys -t lesson:0.0 -X search-backward "bin"; echo "[[TMUXWEB_PROBE:search:1]]"; echo "[[TMUXWEB_PROBE:searchMatched:1]]"',
  },
  {
    label: 'Copy Search 실패',
    command:
      'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux copy-mode -t lesson:0.0; tmux send-keys -t lesson:0.0 -X search-backward "__TMUXWEB_NOT_FOUND__"; echo "[[TMUXWEB_PROBE:search:1]]"; echo "[[TMUXWEB_PROBE:searchMatched:0]]"',
  },
] as const;

const BEGINNER_ENTRY_LESSON = 'hello-tmux';
const ADVANCED_ENTRY_LESSON = 'copy-search';

const VM_BOOT_CONFIG = {
  wasmPath: '/vm/v86.wasm',
  wasmFallbackPath: '/vm/v86-fallback.wasm',
  biosPath: '/vm/seabios.bin',
  vgaBiosPath: '/vm/vgabios.bin',
  fsBasePath: '/vm/alpine-tmux-flat/',
  fsJsonPath: '/vm/alpine-tmux-fs.json',
};

function trimHistory(history: string[], max: number) {
  if (history.length <= max) {
    return history;
  }
  return history.slice(history.length - max);
}

function appendHistory(history: string[], nextItem: string, max: number) {
  const normalized = nextItem.trim();
  if (!normalized) {
    return history;
  }

  if (history[history.length - 1] === normalized) {
    return history;
  }

  return trimHistory([...history, normalized], max);
}

function appendActions(history: string[], actions: string[], max: number) {
  if (actions.length === 0) {
    return history;
  }

  return trimHistory([...history, ...actions], max);
}

function getDifficultyLabel(difficulty: AppMission['difficulty']) {
  switch (difficulty) {
    case 'beginner':
      return '입문';
    case 'daily':
      return '실전';
    case 'advanced':
      return '고급';
    case 'scenario':
      return '시나리오';
    default:
      return difficulty;
  }
}

function getMetricBadgeClass(status: VmStatus) {
  if (status === 'running') {
    return 'is-running';
  }
  if (status === 'booting') {
    return 'is-booting';
  }
  if (status === 'error') {
    return 'is-error';
  }
  return 'is-idle';
}

function computeCompletedTrackSlugs(content: AppContent, completedMissionSlugs: string[]) {
  const completedSet = new Set(completedMissionSlugs);
  const lessonTrackMap = new Map(content.lessons.map((lesson) => [lesson.slug, lesson.trackSlug]));

  return content.tracks
    .filter((track) => {
      const trackMissionSlugs = content.missions
        .filter((mission) => lessonTrackMap.get(mission.lessonSlug) === track.slug)
        .map((mission) => mission.slug);

      if (trackMissionSlugs.length === 0) {
        return false;
      }

      return trackMissionSlugs.every((slug) => completedSet.has(slug));
    })
    .map((track) => track.slug);
}

function createInitialMetrics(): VmMetricState {
  return {
    sessionCount: null,
    windowCount: null,
    paneCount: null,
    modeIs: null,
    searchExecuted: null,
    searchMatchFound: null,
  };
}

export function PracticeVmPocPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contentState, setContentState] = useState<{
    status: 'loading' | 'ready' | 'error';
    content: AppContent | null;
  }>({
    status: 'loading',
    content: null,
  });

  const [selectedLessonSlug, setSelectedLessonSlug] = useState('');
  const [selectedMissionSlug, setSelectedMissionSlug] = useState('');
  const [vmEpoch, setVmEpoch] = useState(0);
  const [vmStatus, setVmStatus] = useState<VmStatus>('idle');
  const [vmStatusText, setVmStatusText] = useState('대기 중');
  const [commandInput, setCommandInput] = useState('tmux list-sessions');
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [actionHistory, setActionHistory] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<VmMetricState>(createInitialMetrics());
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [autoProbe, setAutoProbe] = useState(true);

  const completedMissionSlugs = useProgressStore((store) => store.completedMissionSlugs);
  const recordMissionPass = useProgressStore((store) => store.recordMissionPass);

  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const emulatorRef = useRef<V86 | null>(null);
  const lineBufferRef = useRef('');
  const autoProbeRef = useRef(autoProbe);
  const probeTimerRef = useRef<number | null>(null);
  const celebratedMissionSetRef = useRef(new Set<string>());
  const celebratedLessonSetRef = useRef(new Set<string>());

  const lessonParam = searchParams.get('lesson') ?? '';
  const missionParam = searchParams.get('mission') ?? '';

  const content = contentState.content;

  const lessonMissions = useMemo(() => {
    if (!content || !selectedLessonSlug) {
      return [];
    }

    return content.missions.filter((mission) => mission.lessonSlug === selectedLessonSlug);
  }, [content, selectedLessonSlug]);

  const selectedMission = useMemo(() => {
    if (!selectedMissionSlug) {
      return null;
    }

    return lessonMissions.find((mission) => mission.slug === selectedMissionSlug) ?? null;
  }, [lessonMissions, selectedMissionSlug]);

  const vmSnapshot = useMemo(
    () => ({
      sessionCount: metrics.sessionCount,
      windowCount: metrics.windowCount,
      paneCount: metrics.paneCount,
      modeIs: metrics.modeIs,
      searchExecuted: metrics.searchExecuted,
      searchMatchFound: metrics.searchMatchFound,
      actionHistory,
      commandHistory,
    }),
    [actionHistory, commandHistory, metrics],
  );

  const selectedMissionStatus = useMemo(() => {
    if (!selectedMission) {
      return null;
    }

    return evaluateMissionWithVmSnapshot(selectedMission, vmSnapshot);
  }, [selectedMission, vmSnapshot]);

  const selectedLesson = useMemo(() => {
    if (!content || !selectedLessonSlug) {
      return null;
    }

    return content.lessons.find((lesson) => lesson.slug === selectedLessonSlug) ?? null;
  }, [content, selectedLessonSlug]);

  const selectedLessonTrack = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    return content.tracks.find((track) => track.slug === selectedLesson.trackSlug) ?? null;
  }, [content, selectedLesson]);

  const selectedLessonChapter = useMemo(() => {
    if (!content || !selectedLesson) {
      return null;
    }

    return content.chapters.find((chapter) => chapter.slug === selectedLesson.chapterSlug) ?? null;
  }, [content, selectedLesson]);

  const missionStatusMap = useMemo(() => {
    const result = new Map<string, ReturnType<typeof evaluateMissionWithVmSnapshot>>();

    lessonMissions.forEach((mission) => {
      result.set(mission.slug, evaluateMissionWithVmSnapshot(mission, vmSnapshot));
    });

    return result;
  }, [lessonMissions, vmSnapshot]);

  const lessonCompletedMissionCount = useMemo(() => {
    const completedSet = new Set(completedMissionSlugs);
    return lessonMissions.filter((mission) => completedSet.has(mission.slug)).length;
  }, [completedMissionSlugs, lessonMissions]);

  const manualMissionCandidates = useMemo(() => {
    return lessonMissions.filter((mission) => missionStatusMap.get(mission.slug)?.status === 'manual');
  }, [lessonMissions, missionStatusMap]);

  const selectedMissionOrder = useMemo(() => {
    if (!selectedMission) {
      return null;
    }

    const index = lessonMissions.findIndex((mission) => mission.slug === selectedMission.slug);
    return index === -1 ? null : index + 1;
  }, [lessonMissions, selectedMission]);

  useEffect(() => {
    autoProbeRef.current = autoProbe;
  }, [autoProbe]);

  useEffect(() => {
    let isMounted = true;

    loadAppContent()
      .then((nextContent) => {
        if (!isMounted) {
          return;
        }

        setContentState({
          status: 'ready',
          content: nextContent,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setContentState({
          status: 'error',
          content: null,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!content || selectedLessonSlug) {
      return;
    }

    const firstLessonSlug = content.lessons[0]?.slug ?? '';
    const fromParam = content.lessons.some((lesson) => lesson.slug === lessonParam) ? lessonParam : '';
    setSelectedLessonSlug(fromParam || firstLessonSlug);
  }, [content, lessonParam, selectedLessonSlug]);

  useEffect(() => {
    if (!content || !selectedLessonSlug) {
      return;
    }

    const missions = content.missions.filter((mission) => mission.lessonSlug === selectedLessonSlug);

    if (missions.length === 0) {
      if (selectedMissionSlug) {
        setSelectedMissionSlug('');
      }
      return;
    }

    if (missions.some((mission) => mission.slug === selectedMissionSlug)) {
      return;
    }

    const fromParam = missions.some((mission) => mission.slug === missionParam) ? missionParam : '';
    setSelectedMissionSlug(fromParam || missions[0].slug);
  }, [content, missionParam, selectedLessonSlug, selectedMissionSlug]);

  useEffect(() => {
    if (!selectedLessonSlug) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    if (nextParams.get('lesson') !== selectedLessonSlug) {
      nextParams.set('lesson', selectedLessonSlug);
      changed = true;
    }

    if (selectedMissionSlug) {
      if (nextParams.get('mission') !== selectedMissionSlug) {
        nextParams.set('mission', selectedMissionSlug);
        changed = true;
      }
    } else if (nextParams.has('mission')) {
      nextParams.delete('mission');
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, selectedLessonSlug, selectedMissionSlug, setSearchParams]);

  const pushDebugLine = useCallback((line: string) => {
    const normalized = line.trimEnd();
    if (!normalized) {
      return;
    }

    setDebugLines((previous) => trimHistory([...previous, normalized], MAX_DEBUG_LINES));
  }, []);

  const updateMetricByProbe = useCallback((metric: VmProbeMetric) => {
    setVmStatus('running');
    setVmStatusText('부팅 완료, 명령 입력 가능');

    setMetrics((previous) => {
      switch (metric.key) {
        case 'session':
          return {
            ...previous,
            sessionCount: metric.value >= 0 ? metric.value : null,
          };
        case 'window':
          return {
            ...previous,
            windowCount: metric.value >= 0 ? metric.value : null,
          };
        case 'pane':
          return {
            ...previous,
            paneCount: metric.value >= 0 ? metric.value : null,
          };
        case 'mode':
          return {
            ...previous,
            modeIs: metric.value === 1 ? 'COPY_MODE' : null,
          };
        case 'search':
          return {
            ...previous,
            searchExecuted: metric.value === 1,
          };
        case 'searchMatched':
          return {
            ...previous,
            searchMatchFound: metric.value === 1,
          };
        default:
          return previous;
      }
    });
  }, []);

  const registerCommand = useCallback((command: string) => {
    const normalizedCommand = command.trim();
    if (!normalizedCommand) {
      return;
    }

    setCommandHistory((previous) => appendHistory(previous, normalizedCommand, MAX_HISTORY));

    const actions = parseTmuxActionsFromCommand(normalizedCommand);
    if (actions.length > 0) {
      setActionHistory((previous) => appendActions(previous, actions, MAX_HISTORY));
    }

    const lower = normalizedCommand.toLowerCase();

    if (/\btmux\s+copy-mode\b/.test(lower)) {
      setMetrics((previous) => ({
        ...previous,
        modeIs: 'COPY_MODE',
      }));
    }

    if (/(search-forward|search-backward|search -)/.test(lower) || /send-keys\s+.*-x\s+search/.test(lower)) {
      setMetrics((previous) => ({
        ...previous,
        searchExecuted: true,
      }));
    }
  }, []);

  const scheduleProbe = useCallback((delayMs = 450) => {
    if (!autoProbeRef.current) {
      return;
    }

    if (probeTimerRef.current !== null) {
      window.clearTimeout(probeTimerRef.current);
    }

    probeTimerRef.current = window.setTimeout(() => {
      probeTimerRef.current = null;
      if (!emulatorRef.current) {
        return;
      }
      emulatorRef.current.serial0_send(`${PROBE_COMMAND}\n`);
    }, delayMs);
  }, []);

  const sendCommand = useCallback(
    (command: string, options?: { trackCommand?: boolean; probeAfter?: boolean }) => {
      const normalized = command.trim();
      if (!normalized || !emulatorRef.current) {
        return;
      }

      emulatorRef.current.serial0_send(`${normalized}\n`);

      const trackCommand = options?.trackCommand ?? true;
      const probeAfter = options?.probeAfter ?? true;

      if (trackCommand) {
        registerCommand(normalized);
      }

      if (probeAfter) {
        scheduleProbe();
      }
    },
    [registerCommand, scheduleProbe],
  );

  useEffect(() => {
    if (contentState.status !== 'ready') {
      return undefined;
    }

    let isMounted = true;
    let serialListener: ((value?: unknown) => void) | null = null;
    let loadedListener: ((value?: unknown) => void) | null = null;
    let stopListener: ((value?: unknown) => void) | null = null;

    setVmStatus('booting');
    setVmStatusText('v86 초기화 중');

    const host = terminalHostRef.current;
    if (!host) {
      setVmStatus('error');
      setVmStatusText('터미널 DOM 초기화 실패');
      return undefined;
    }

    setMetrics(createInitialMetrics());
    setActionHistory([]);
    setCommandHistory([]);
    setDebugLines([]);
    setCelebration(null);
    lineBufferRef.current = '';

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      cols: 120,
      rows: 30,
      fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#020617',
        foreground: '#dbeafe',
        cursor: '#f8fafc',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);
    fitAddon.fit();
    terminal.focus();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const resizeHandler = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', resizeHandler);

    const dataDisposable = terminal.onData((data) => {
      if (!emulatorRef.current) {
        return;
      }
      emulatorRef.current.serial0_send(data);
    });

    const writeByte = (value: number) => {
      const char = String.fromCharCode(value & 0xff);
      terminal.write(char);

      if (char === '\r') {
        return;
      }

      if (char === '\n') {
        const completedLine = lineBufferRef.current;
        lineBufferRef.current = '';

        const probeMetric = parseProbeMetricFromLine(completedLine);
        if (probeMetric) {
          updateMetricByProbe(probeMetric);
          return;
        }

        const extractedCommand = extractCommandFromPromptLine(completedLine);
        if (extractedCommand) {
          registerCommand(extractedCommand);
          scheduleProbe();
        }

        pushDebugLine(completedLine);

        const normalizedLine = completedLine.toLowerCase();
        if (normalizedLine.includes('login:') || /[#$]\s*$/.test(normalizedLine)) {
          setVmStatusText('부팅 완료, 명령 입력 가능');
          setVmStatus('running');
        }
        return;
      }

      if (char === '\b' || char === String.fromCharCode(127)) {
        lineBufferRef.current = lineBufferRef.current.slice(0, -1);
        return;
      }

      if (char >= ' ') {
        lineBufferRef.current += char;
      }
    };

    (async () => {
      try {
        const module = await import('v86');
        if (!isMounted) {
          return;
        }

        const V86Ctor = module.default;

        const emulator = new V86Ctor({
          wasm_path: VM_BOOT_CONFIG.wasmPath,
          wasm_fallback_path: VM_BOOT_CONFIG.wasmFallbackPath,
          memory_size: 256 * 1024 * 1024,
          vga_memory_size: 8 * 1024 * 1024,
          bios: { url: VM_BOOT_CONFIG.biosPath },
          vga_bios: { url: VM_BOOT_CONFIG.vgaBiosPath },
          filesystem: {
            basefs: {
              url: VM_BOOT_CONFIG.fsJsonPath,
            },
            baseurl: VM_BOOT_CONFIG.fsBasePath,
          },
          bzimage_initrd_from_filesystem: true,
          cmdline:
            'rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose console=ttyS0 init=/sbin/init',
          disable_keyboard: true,
          disable_mouse: true,
          autostart: true,
        });

        emulatorRef.current = emulator;

        loadedListener = () => {
          setVmStatusText('커널 및 루트FS 로딩 완료');
        };

        stopListener = () => {
          setVmStatus('stopped');
          setVmStatusText('VM이 중지되었습니다');
        };

        serialListener = (value) => {
          if (typeof value !== 'number') {
            return;
          }
          writeByte(value);
        };

        emulator.add_listener('emulator-loaded', loadedListener);
        emulator.add_listener('emulator-stopped', stopListener);
        emulator.add_listener('serial0-output-byte', serialListener);

        setVmStatus('booting');
        setVmStatusText('VM 부팅 중...');

        window.setTimeout(() => {
          if (!emulatorRef.current) {
            return;
          }
          emulatorRef.current.serial0_send('\n');
          emulatorRef.current.serial0_send(`${PROBE_COMMAND}\n`);
        }, 2600);
      } catch {
        setVmStatus('error');
        setVmStatusText('v86 초기화 실패 (bios/wasm 경로 확인 필요)');
      }
    })();

    return () => {
      isMounted = false;

      if (probeTimerRef.current !== null) {
        window.clearTimeout(probeTimerRef.current);
        probeTimerRef.current = null;
      }

      dataDisposable.dispose();
      window.removeEventListener('resize', resizeHandler);

      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }

      fitAddonRef.current = null;

      const emulator = emulatorRef.current;
      emulatorRef.current = null;

      if (emulator) {
        if (loadedListener) {
          emulator.remove_listener('emulator-loaded', loadedListener);
        }
        if (stopListener) {
          emulator.remove_listener('emulator-stopped', stopListener);
        }
        if (serialListener) {
          emulator.remove_listener('serial0-output-byte', serialListener);
        }

        void Promise.resolve(emulator.stop()).catch(() => undefined);
        void Promise.resolve(emulator.destroy()).catch(() => undefined);
      }
    };
  }, [
    contentState.status,
    pushDebugLine,
    registerCommand,
    scheduleProbe,
    updateMetricByProbe,
    vmEpoch,
  ]);

  useEffect(() => {
    if (!content || !selectedMission || !selectedMissionStatus) {
      return;
    }

    const missionSlug = selectedMission.slug;

    if (selectedMissionStatus.status !== 'complete') {
      return;
    }

    if (celebratedMissionSetRef.current.has(missionSlug)) {
      return;
    }

    if (completedMissionSlugs.includes(missionSlug)) {
      celebratedMissionSetRef.current.add(missionSlug);
      return;
    }

    celebratedMissionSetRef.current.add(missionSlug);

    const completedTrackSlugs = computeCompletedTrackSlugs(content, [...completedMissionSlugs, missionSlug]);
    const gainedXp = recordMissionPass({
      missionSlug,
      difficulty: selectedMission.difficulty,
      hintLevel: 0,
      attemptNumber: 1,
      completedTrackSlugs,
    });

    setCelebration({
      kind: 'mission',
      message: `미션 완료: ${selectedMission.title}`,
      detail: `자동 판정 통과, XP +${gainedXp}`,
    });
  }, [
    completedMissionSlugs,
    content,
    recordMissionPass,
    selectedMission,
    selectedMissionStatus,
    vmSnapshot,
  ]);

  useEffect(() => {
    if (!selectedLesson || lessonMissions.length === 0) {
      return;
    }

    const completedSet = new Set(completedMissionSlugs);
    const lessonCompleted = lessonMissions.every((mission) => completedSet.has(mission.slug));

    if (!lessonCompleted) {
      return;
    }

    if (celebratedLessonSetRef.current.has(selectedLesson.slug)) {
      return;
    }

    celebratedLessonSetRef.current.add(selectedLesson.slug);
    setCelebration({
      kind: 'lesson',
      message: `레슨 완료: ${selectedLesson.title}`,
      detail: `${lessonMissions.length}개 미션을 모두 완료했습니다.`,
    });
  }, [completedMissionSlugs, lessonMissions, selectedLesson]);

  const handleManualMissionComplete = useCallback(() => {
    if (!content || !selectedMission) {
      return;
    }

    if (completedMissionSlugs.includes(selectedMission.slug)) {
      return;
    }

    const completedTrackSlugs = computeCompletedTrackSlugs(content, [
      ...completedMissionSlugs,
      selectedMission.slug,
    ]);

    const gainedXp = recordMissionPass({
      missionSlug: selectedMission.slug,
      difficulty: selectedMission.difficulty,
      hintLevel: 1,
      attemptNumber: 1,
      completedTrackSlugs,
    });

    setCelebration({
      kind: 'mission',
      message: `수동 완료 처리: ${selectedMission.title}`,
      detail: `수동 브리지 기록 완료, XP +${gainedXp}`,
    });
  }, [content, completedMissionSlugs, recordMissionPass, selectedMission]);

  const lessonObjectivePreview = selectedLesson?.objectives.slice(0, 3) ?? [];
  const hiddenObjectiveCount = selectedLesson
    ? Math.max(selectedLesson.objectives.length - lessonObjectivePreview.length, 0)
    : 0;

  if (contentState.status === 'loading') {
    return (
      <PagePlaceholder
        eyebrow="Practice"
        title="Browser VM 초기화 중"
        description="커리큘럼과 VM 리소스를 로딩하고 있습니다."
      />
    );
  }

  if (contentState.status === 'error' || !content) {
    return (
      <PagePlaceholder
        eyebrow="Practice"
        title="VM Practice 로드 실패"
        description="커리큘럼 데이터를 읽지 못했습니다."
      >
        <div className="inline-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              window.location.reload();
            }}
          >
            새로고침
          </button>
        </div>
      </PagePlaceholder>
    );
  }

  return (
    <PagePlaceholder
      eyebrow="Practice"
      title="Browser VM tmux Lab"
      description="레거시 시뮬레이터를 대체한 실제 VM 기반 tmux 실습 환경입니다."
    >
      <div className="vm-poc-panel">
        <details className="vm-poc-note">
          <summary>실습 환경 안내</summary>
          <p>
            <strong>실행 방식:</strong> 브라우저 안에서 v86 + Alpine Linux + tmux를 직접 실행합니다. 입력은
            xterm.js를 통해 시리얼 콘솔로 전달됩니다.
          </p>
          <p>
            <strong>브리지:</strong> VM 출력에서 tmux 상태/행동을 probe로 수집해 미션 완료를 자동 판정합니다.
          </p>
        </details>

        {celebration ? (
          <section className={`vm-celebration vm-celebration-${celebration.kind}`} role="status" aria-live="polite">
            <p>
              <strong>{celebration.message}</strong>
            </p>
            <p>{celebration.detail}</p>
          </section>
        ) : null}

        <section className="vm-workbench">
          <aside className="vm-study-panel">
            <section className="vm-curriculum-panel vm-curriculum-row-layout">
              <div className="inline-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSelectedLessonSlug(BEGINNER_ENTRY_LESSON);
                    const nextMission = content.missions.find((mission) => mission.lessonSlug === BEGINNER_ENTRY_LESSON);
                    setSelectedMissionSlug(nextMission?.slug ?? '');
                  }}
                >
                  초급 코어
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSelectedLessonSlug(ADVANCED_ENTRY_LESSON);
                    const nextMission = content.missions.find((mission) => mission.lessonSlug === ADVANCED_ENTRY_LESSON);
                    setSelectedMissionSlug(nextMission?.slug ?? '');
                  }}
                >
                  심화 과정
                </button>
              </div>
              <div className="vm-curriculum-grid">
                <div className="vm-curriculum-row">
                  <label htmlFor="lesson-select">Lesson</label>
                  <select
                    id="lesson-select"
                    className="sim-input"
                    value={selectedLessonSlug}
                    onChange={(event) => {
                      const nextLessonSlug = event.target.value;
                      setSelectedLessonSlug(nextLessonSlug);
                      const nextMission = content.missions.find((mission) => mission.lessonSlug === nextLessonSlug);
                      setSelectedMissionSlug(nextMission?.slug ?? '');
                    }}
                  >
                    {content.lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.slug}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="vm-curriculum-row">
                  <label htmlFor="mission-select">Mission</label>
                  <select
                    id="mission-select"
                    className="sim-input"
                    value={selectedMissionSlug}
                    onChange={(event) => setSelectedMissionSlug(event.target.value)}
                  >
                    {lessonMissions.map((mission) => (
                      <option key={mission.id} value={mission.slug}>
                        {mission.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="vm-lesson-progress">
                <p>
                  <strong>Lesson 진행:</strong> {lessonCompletedMissionCount}/{lessonMissions.length}
                </p>
                <p className="muted">manual 판정 미션: {manualMissionCandidates.length}</p>
              </div>
              <div className={`vm-runtime-badge ${getMetricBadgeClass(vmStatus)}`}>
                <span>VM 상태: {vmStatus}</span>
                <span>{vmStatusText}</span>
              </div>
            </section>

            {selectedLesson ? (
              <section className="vm-lesson-card">
                <p className="vm-lesson-card-path">
                  {selectedLessonTrack?.title ?? selectedLesson.trackSlug} ·{' '}
                  {selectedLessonChapter?.title ?? selectedLesson.chapterSlug}
                </p>
                <h2>{selectedLesson.title}</h2>
                <p className="muted">
                  예상 {selectedLesson.estimatedMinutes}분 · 목표 {selectedLesson.objectives.length}개
                </p>
                {selectedLesson.goal ? (
                  <p>
                    <strong>레슨 목표:</strong> {selectedLesson.goal}
                  </p>
                ) : null}
                <ul className="link-list">
                  {lessonObjectivePreview.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                  {hiddenObjectiveCount > 0 ? <li className="muted">+ {hiddenObjectiveCount}개 목표 더 있음</li> : null}
                </ul>
                <div className="inline-actions">
                  <Link
                    className="secondary-btn"
                    to={`/learn/${selectedLesson.trackSlug}/${selectedLesson.chapterSlug}/${selectedLesson.slug}`}
                  >
                    레슨 상세 보기
                  </Link>
                </div>
              </section>
            ) : null}

            <section className="vm-mission-list-card">
              <h2>미션 목록</h2>
              <div className="vm-mission-list">
                {lessonMissions.map((mission, index) => {
                  const missionStatus = missionStatusMap.get(mission.slug);
                  const isSelected = mission.slug === selectedMissionSlug;
                  const isCompleted = completedMissionSlugs.includes(mission.slug);

                  let badgeClass = 'is-pending';
                  let badgeLabel = '대기';

                  if (isCompleted) {
                    badgeClass = 'is-complete';
                    badgeLabel = '완료';
                  } else if (missionStatus?.status === 'complete') {
                    badgeClass = 'is-live-complete';
                    badgeLabel = '실시간 통과';
                  } else if (missionStatus?.status === 'manual') {
                    badgeClass = 'is-manual';
                    badgeLabel = '수동';
                  }

                  return (
                    <button
                      key={mission.id}
                      type="button"
                      className={`vm-mission-row ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setSelectedMissionSlug(mission.slug)}
                    >
                      <span className="vm-mission-row-main">
                        <strong>
                          {index + 1}. {mission.title}
                        </strong>
                        <small>난이도 {getDifficultyLabel(mission.difficulty)}</small>
                      </span>
                      <span className={`vm-mission-row-badge ${badgeClass}`}>{badgeLabel}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedMission ? (
              <article className="vm-mission-card">
                <h2>
                  현재 미션
                  {selectedMissionOrder ? ` ${selectedMissionOrder}/${lessonMissions.length}` : ''}
                </h2>
                <p className="muted">
                  {selectedMission.title} · 난이도 {getDifficultyLabel(selectedMission.difficulty)}
                </p>
                <ul className="link-list">
                  {selectedMission.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
                {selectedMissionStatus ? (
                  <div className="vm-mission-status">
                    <p>
                      <strong>판정:</strong> {selectedMissionStatus.status} · {selectedMissionStatus.reason}
                    </p>
                    {selectedMissionStatus.status === 'manual' ? (
                      <button type="button" className="secondary-btn" onClick={handleManualMissionComplete}>
                        수동 완료 처리
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ) : null}
          </aside>

          <section className="vm-lab-panel">
            <section className="vm-poc-controls">
              <div className="inline-actions">
                <Link className="secondary-btn" to="/learn">
                  커리큘럼으로 이동
                </Link>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setVmEpoch((value) => value + 1);
                  }}
                >
                  VM 재시작
                </button>
                <label className="vm-poc-check" htmlFor="auto-probe-toggle">
                  <input
                    id="auto-probe-toggle"
                    type="checkbox"
                    checked={autoProbe}
                    onChange={(event) => setAutoProbe(event.target.checked)}
                  />
                  Auto probe
                </label>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    sendCommand(PROBE_COMMAND, { trackCommand: false, probeAfter: false });
                  }}
                >
                  Probe 지금 실행
                </button>
              </div>

              <form
                className="vm-poc-command-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendCommand(commandInput);
                }}
              >
                <input
                  className="vm-poc-command-input"
                  value={commandInput}
                  onChange={(event) => setCommandInput(event.target.value)}
                  placeholder="tmux new-session -d -s lesson"
                  aria-label="VM shell command"
                />
                <button type="submit" className="primary-btn" disabled={vmStatus === 'error'}>
                  명령 실행
                </button>
              </form>

              <div className="vm-poc-quick">
                {QUICK_COMMANDS.map((item) => (
                  <button key={item.label} type="button" className="secondary-btn" onClick={() => sendCommand(item.command)}>
                    {item.label}
                  </button>
                ))}
              </div>

              <p className="vm-poc-status">
                metrics · sessions {metrics.sessionCount ?? '-'} / windows {metrics.windowCount ?? '-'} / panes{' '}
                {metrics.paneCount ?? '-'} / mode {metrics.modeIs ?? '-'} / search{' '}
                {metrics.searchExecuted === null ? '-' : metrics.searchExecuted ? 'yes' : 'no'} / match{' '}
                {metrics.searchMatchFound === null ? '-' : metrics.searchMatchFound ? 'yes' : 'no'}
              </p>
            </section>

            <section className="vm-terminal-shell" aria-label="VM terminal">
              <div className="vm-terminal-host" ref={terminalHostRef} />
            </section>

            <details className="vm-poc-debug">
              <summary>브리지 디버그</summary>
              <div className="vm-debug-grid">
                <article>
                  <h3>Recent Action History</h3>
                  <pre className="vm-poc-debug-text">{actionHistory.slice(-20).join('\n') || '(empty)'}</pre>
                </article>
                <article>
                  <h3>Recent Command History</h3>
                  <pre className="vm-poc-debug-text">{commandHistory.slice(-20).join('\n') || '(empty)'}</pre>
                </article>
                <article>
                  <h3>Recent VM Output Lines</h3>
                  <pre className="vm-poc-debug-text">{debugLines.slice(-50).join('\n') || '(empty)'}</pre>
                </article>
              </div>
            </details>
          </section>
        </section>
      </div>
    </PagePlaceholder>
  );
}
