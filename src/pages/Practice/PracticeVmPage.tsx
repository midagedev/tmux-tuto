import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import type V86 from 'v86';
import type { V86Options } from 'v86';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { resolveLessonTerms } from '../../features/curriculum/lessonTerms';
import { useProgressStore } from '../../features/progress/progressStore';
import { evaluateMissionWithVmSnapshot, type VmProbeMetric, type VmProbeStateSnapshot } from '../../features/vm/missionBridge';
import {
  buildMetricStatusItems,
  buildMissionCommandSuggestions,
  buildMissionPreconditionItems,
} from './practiceVmHelpers';
import { LEARNING_PATH_ENTRY_LESSON, LESSON_FILTER_OPTIONS } from './practiceVmConstants';
import { PracticeLabPanel } from './components/PracticeLabPanel';
import { PracticeLessonBanner } from './components/PracticeLessonBanner';
import { PracticeLessonCatalogPanel } from './components/PracticeLessonCatalogPanel';
import { PracticeMissionPanel } from './components/PracticeMissionPanel';
import {
  createInitialMetrics,
  type VmMetricState,
} from './vmMetrics';
import { useMetricVisualEffects } from './hooks/useMetricVisualEffects';
import { usePracticeLessonSelection } from './hooks/usePracticeLessonSelection';
import { usePracticeMissionCompletion } from './hooks/usePracticeMissionCompletion';
import { usePracticeVmInteraction } from './hooks/usePracticeVmInteraction';
import { usePracticeVmBootstrap } from './hooks/usePracticeVmBootstrap';
import type { ProbeSchedulerState } from './probeScheduler';
import { TERMINAL_GEOMETRY_SYNC_COMMAND, VM_BOOT_CONFIG } from './vmBoot';

type VmStatus = 'idle' | 'booting' | 'running' | 'stopped' | 'error';

declare global {
  interface Window {
    __tmuxwebVmBridge?: {
      isReady: () => boolean;
      getStatus: () => {
        status: VmStatus;
        text: string;
        metrics: VmMetricState;
        actionHistory: string[];
        commandHistory: string[];
        debugLineCount: number;
        lastDebugLine: string | null;
        probeScheduler: ProbeSchedulerState;
      };
      saveState: () => Promise<ArrayBuffer | null>;
      sendProbe: () => void;
      sendCommand: (command: string) => void;
      injectProbeMetric: (metric: VmProbeMetric) => void;
      injectProbeState: (snapshot: VmProbeStateSnapshot) => void;
      injectCommandHistory: (command: string) => void;
      injectActionHistory: (action: string) => void;
      getBootConfig: () => typeof VM_BOOT_CONFIG;
      getLastEmulatorOptions: () => V86Options | null;
    };
  }
}

export function PracticeVmPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vmEpoch, setVmEpoch] = useState(0);
  const [vmStatus, setVmStatus] = useState<VmStatus>('idle');
  const [vmStatusText, setVmStatusText] = useState(t('대기 중'));
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [actionHistory, setActionHistory] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<VmMetricState>(createInitialMetrics());
  const [mobileWorkbenchView, setMobileWorkbenchView] = useState<'mission' | 'terminal'>('terminal');

  const completedMissionSlugs = useProgressStore((store) => store.completedMissionSlugs);
  const recordMissionPass = useProgressStore((store) => store.recordMissionPass);
  const recordTmuxActivity = useProgressStore((store) => store.recordTmuxActivity);
  const startMissionSession = useProgressStore((store) => store.startMissionSession);

  const {
    contentState,
    content,
    lessonFilter,
    setLessonFilter,
    trackTitleMap,
    chapterTitleMap,
    filteredLessonRows,
    lessonMissions,
    selectedLesson,
    selectedLessonTrack,
    selectedLessonChapter,
    selectedMission,
    selectedLessonSlug,
    selectedMissionSlug,
    selectedMissionOrder,
    nextLesson,
    selectedMissionCompleted,
    lessonCompletedMissionCount,
    nextIncompleteMission,
    lessonCompleted,
    selectLessonForAction: selectLessonForActionBase,
    selectMissionForAction: selectMissionForActionBase,
    selectNextLessonForAction: selectNextLessonForActionBase,
  } = usePracticeLessonSelection({
    searchParams,
    setSearchParams,
    completedMissionSlugs,
    startMissionSession,
  });

  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const studyPanelRef = useRef<HTMLElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const emulatorRef = useRef<V86 | null>(null);
  const lastEmulatorOptionsRef = useRef<V86Options | null>(null);
  const vmInternalBridgeReadyRef = useRef(false);
  const vmWarmBannerPendingRef = useRef(false);
  const selectedLessonSlugRef = useRef(selectedLessonSlug);
  const recordTmuxActivityRef = useRef(recordTmuxActivity);
  const metricsRef = useRef<VmMetricState>(createInitialMetrics());
  const searchProbeTimerRef = useRef<number | null>(null);

  const {
    metricHighlightState,
    isTerminalFlashActive,
    triggerMetricVisualEffect,
    clearMetricVisualEffects,
    clearMetricVisualState,
  } = useMetricVisualEffects();

  const warmParam = searchParams.get('warm') ?? '';
  const disableWarmStart = warmParam === '0' || warmParam.toLowerCase() === 'off';

  const vmSnapshot = useMemo(
    () => ({
      sessionCount: metrics.sessionCount,
      windowCount: metrics.windowCount,
      paneCount: metrics.paneCount,
      modeIs: metrics.modeIs,
      sessionName: metrics.sessionName,
      windowName: metrics.windowName,
      activeWindowIndex: metrics.activeWindowIndex,
      windowLayout: metrics.windowLayout,
      windowZoomed: metrics.windowZoomed,
      paneSynchronized: metrics.paneSynchronized,
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

  const missionStatusMap = useMemo(() => {
    const result = new Map<string, ReturnType<typeof evaluateMissionWithVmSnapshot>>();

    lessonMissions.forEach((mission) => {
      result.set(mission.slug, evaluateMissionWithVmSnapshot(mission, vmSnapshot));
    });

    return result;
  }, [lessonMissions, vmSnapshot]);

  const manualMissionCandidates = useMemo(() => {
    return lessonMissions.filter((mission) => missionStatusMap.get(mission.slug)?.status === 'manual');
  }, [lessonMissions, missionStatusMap]);

  const resetPracticeScrollPosition = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    studyPanelRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const selectLessonForAction = useCallback(
    (lessonSlug: string, options?: { resetFilter?: boolean }) => {
      selectLessonForActionBase(lessonSlug, options);
      setMobileWorkbenchView('mission');
      resetPracticeScrollPosition();
    },
    [resetPracticeScrollPosition, selectLessonForActionBase],
  );

  const selectMissionForAction = useCallback(
    (missionSlug: string) => {
      selectMissionForActionBase(missionSlug);
      setMobileWorkbenchView('mission');
      resetPracticeScrollPosition();
    },
    [resetPracticeScrollPosition, selectMissionForActionBase],
  );

  const selectNextLessonForAction = useCallback(() => {
    selectNextLessonForActionBase();
    setMobileWorkbenchView('mission');
    resetPracticeScrollPosition();
  }, [resetPracticeScrollPosition, selectNextLessonForActionBase]);

  useEffect(() => {
    selectedLessonSlugRef.current = selectedLessonSlug;
  }, [selectedLessonSlug]);

  useEffect(() => {
    recordTmuxActivityRef.current = recordTmuxActivity;
  }, [recordTmuxActivity]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  const { handleManualMissionComplete } = usePracticeMissionCompletion({
    content,
    selectedLesson,
    selectedMission,
    selectedMissionStatus,
    lessonMissions,
    completedMissionSlugs,
    recordMissionPass,
  });
  const {
    pushDebugLine,
    updateMetricsByProbeState,
    requestBootstrapProbe,
    sendInternalCommand,
    requestSearchProbe,
    registerCommand,
    sendCommand,
  } = usePracticeVmInteraction({
    t,
    autoProbe: true,
    vmStatus,
    vmStatusText,
    metrics,
    actionHistory,
    commandHistory,
    debugLines,
    setVmStatus,
    setVmStatusText,
    setMetrics,
    setActionHistory,
    setCommandHistory,
    setDebugLines,
    metricsRef,
    selectedLessonSlugRef,
    emulatorRef,
    vmInternalBridgeReadyRef,
    searchProbeTimerRef,
    lastEmulatorOptionsRef,
    recordTmuxActivityRef,
    triggerMetricVisualEffect,
    bootConfig: VM_BOOT_CONFIG,
  });

  usePracticeVmBootstrap({
    t,
    contentReady: contentState.status === 'ready',
    vmEpoch,
    disableWarmStart,
    terminalHostRef,
    terminalRef,
    emulatorRef,
    lastEmulatorOptionsRef,
    vmInternalBridgeReadyRef,
    vmWarmBannerPendingRef,
    searchProbeTimerRef,
    metricsRef,
    setVmStatus,
    setVmStatusText,
    setMetrics,
    setActionHistory,
    setCommandHistory,
    setDebugLines,
    clearMetricVisualEffects,
    clearMetricVisualState,
    pushDebugLine,
    updateMetricsByProbeState,
    registerCommand,
    requestSearchProbe,
    requestBootstrapProbe,
    sendInternalCommand,
    terminalGeometrySyncCommand: TERMINAL_GEOMETRY_SYNC_COMMAND,
    bootConfig: VM_BOOT_CONFIG,
  });

  const missionHintPreview = selectedMission?.hints.slice(0, 2) ?? [];
  const hiddenMissionHintCount = selectedMission
    ? Math.max(selectedMission.hints.length - missionHintPreview.length, 0)
    : 0;
  const metricStatusItems = useMemo(() => buildMetricStatusItems(metrics), [metrics]);
  const bannerLessonTerms = useMemo(() => {
    if (!selectedLesson) {
      return [];
    }
    return resolveLessonTerms(selectedLesson, lessonMissions, content?.termGlossary ?? null);
  }, [selectedLesson, lessonMissions, content]);

  const selectedMissionCommands = useMemo(() => buildMissionCommandSuggestions(selectedMission), [selectedMission]);
  const selectedMissionPreconditions = useMemo(
    () => buildMissionPreconditionItems(t, selectedMission, vmSnapshot),
    [selectedMission, t, vmSnapshot],
  );

  if (contentState.status === 'loading') {
    return (
      <PagePlaceholder
        eyebrow="Practice"
        title={t('Browser VM 초기화 중')}
        description={t('커리큘럼과 VM 리소스를 로딩하고 있습니다.')}
      />
    );
  }

  if (contentState.status === 'error' || !content) {
    return (
      <PagePlaceholder
        eyebrow="Practice"
        title={t('VM Practice 로드 실패')}
        description={t('커리큘럼 데이터를 읽지 못했습니다.')}
      >
        <div className="inline-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('새로고침')}
          </button>
        </div>
      </PagePlaceholder>
    );
  }

  return (
    <section className="page-card practice-page-card" aria-label={t('tmux 실습')}>
      <p className="vm-mobile-hint">
        {t('원활한 실습을 위해 데스크톱 브라우저 사용을 권장합니다.')}
      </p>
      <div className="vm-practice-panel">
        <div className="vm-mobile-switch" role="tablist" aria-label={t('실습 화면 전환')}>
          <button
            type="button"
            className={`secondary-btn ${mobileWorkbenchView === 'mission' ? 'is-active' : ''}`}
            onClick={() => setMobileWorkbenchView('mission')}
          >
            {t('미션')}
          </button>
          <button
            type="button"
            className={`secondary-btn ${mobileWorkbenchView === 'terminal' ? 'is-active' : ''}`}
            onClick={() => setMobileWorkbenchView('terminal')}
          >
            {t('터미널')}
          </button>
        </div>

        <section className={`vm-workbench vm-workbench-view-${mobileWorkbenchView}`}>
          <aside ref={studyPanelRef} className="vm-mission-panel">
            <PracticeMissionPanel
              t={t}
              selectedMission={selectedMission}
              selectedMissionOrder={selectedMissionOrder}
              lessonMissions={lessonMissions}
              selectedMissionCommands={selectedMissionCommands}
              selectedMissionPreconditions={selectedMissionPreconditions}
              missionHintPreview={missionHintPreview}
              hiddenMissionHintCount={hiddenMissionHintCount}
              selectedMissionStatus={selectedMissionStatus}
              selectedMissionCompleted={selectedMissionCompleted}
              lessonCompleted={lessonCompleted}
              nextIncompleteMission={nextIncompleteMission}
              nextLesson={nextLesson}
              lessonCompletedMissionCount={lessonCompletedMissionCount}
              missionStatusMap={missionStatusMap}
              selectedLessonSlug={selectedLessonSlug}
              selectedMissionSlug={selectedMissionSlug}
              completedMissionSlugs={completedMissionSlugs}
              onCommandSelect={(command) => {
                sendCommand(command);
                setMobileWorkbenchView('terminal');
              }}
              onManualMissionComplete={handleManualMissionComplete}
              onSelectMission={selectMissionForAction}
              onSelectNextLesson={selectNextLessonForAction}
            />
          </aside>

          <section className="vm-content-panel">
            {selectedLesson ? (
              <PracticeLessonBanner
                t={t}
                selectedLesson={selectedLesson}
                selectedLessonTrack={selectedLessonTrack}
                selectedLessonChapter={selectedLessonChapter}
                lessonMissions={lessonMissions}
                bannerLessonTerms={bannerLessonTerms}
              />
            ) : null}

            <PracticeLabPanel
              t={t}
              metricStatusItems={metricStatusItems}
              metricHighlightState={metricHighlightState}
              isTerminalFlashActive={isTerminalFlashActive}
              terminalHostRef={terminalHostRef}
              actionHistory={actionHistory}
              commandHistory={commandHistory}
              debugLines={debugLines}
              onRestartVm={() => {
                setVmEpoch((value) => value + 1);
              }}
            />

            <PracticeLessonCatalogPanel
              t={t}
              lessonFilter={lessonFilter}
              lessonFilterOptions={LESSON_FILTER_OPTIONS}
              filteredLessonRows={filteredLessonRows}
              selectedLessonSlug={selectedLessonSlug}
              trackTitleMap={trackTitleMap}
              chapterTitleMap={chapterTitleMap}
              lessonCompletedMissionCount={lessonCompletedMissionCount}
              lessonMissionCount={lessonMissions.length}
              manualMissionCandidatesCount={manualMissionCandidates.length}
              vmStatus={vmStatus}
              vmStatusText={vmStatusText}
              onSelectLearningPathEntry={() => selectLessonForAction(LEARNING_PATH_ENTRY_LESSON, { resetFilter: true })}
              onLessonFilterChange={setLessonFilter}
              onSelectLesson={selectLessonForAction}
            />
          </section>
        </section>
      </div>
    </section>
  );
}
