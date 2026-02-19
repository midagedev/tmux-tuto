import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import { listAchievementDefinitions } from '../../features/progress';
import { useProgressStore } from '../../features/progress/progressStore';
import type { MilestoneSlug } from '../../features/sharing';
import {
  buildAbsoluteAchievementShareUrl,
  buildAchievementChallengeShareText,
  buildSharePath,
  buildTwitterIntentUrl,
  computeMilestoneProgress,
  getMilestoneMeta,
} from '../../features/sharing';

function formatSessionDateTime(iso: string | null) {
  if (!iso) {
    return '-';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProgressPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState<AppContent | null>(null);

  const xp = useProgressStore((store) => store.xp);
  const level = useProgressStore((store) => store.level);
  const streakDays = useProgressStore((store) => store.streakDays);
  const completedMissionSlugs = useProgressStore((store) => store.completedMissionSlugs);
  const missionSessions = useProgressStore((store) => store.missionSessions);
  const unlockedCoreAchievements = useProgressStore((store) => store.unlockedCoreAchievements);
  const unlockedFunAchievements = useProgressStore((store) => store.unlockedFunAchievements);
  const tmuxSkillStats = useProgressStore((store) => store.tmuxSkillStats);
  const recordMissionPass = useProgressStore((store) => store.recordMissionPass);

  useEffect(() => {
    loadAppContent()
      .then((loaded) => setContent(loaded))
      .catch(() => setContent(null));
  }, []);

  const missionTrackMap = useMemo(() => {
    if (!content) {
      return new Map<string, string>();
    }

    const lessonTrackMap = new Map(content.lessons.map((lesson) => [lesson.slug, lesson.trackSlug]));
    return new Map(content.missions.map((mission) => [mission.slug, lessonTrackMap.get(mission.lessonSlug) ?? '']));
  }, [content]);

  const trackProgress = useMemo(() => {
    if (!content) {
      return [] as Array<{
        trackSlug: string;
        trackTitle: string;
        completedCount: number;
        totalCount: number;
        ratio: number;
      }>;
    }

    return content.tracks.map((track) => {
      const trackMissionSlugs = content.missions
        .filter((mission) => missionTrackMap.get(mission.slug) === track.slug)
        .map((mission) => mission.slug);
      const completedCount = trackMissionSlugs.filter((slug) => completedMissionSlugs.includes(slug)).length;
      const totalCount = Math.max(1, trackMissionSlugs.length);
      const ratio = Math.round((completedCount / totalCount) * 100);

      return {
        trackSlug: track.slug,
        trackTitle: track.title,
        completedCount,
        totalCount,
        ratio,
      };
    });
  }, [content, completedMissionSlugs, missionTrackMap]);

  const recommendedMissions = useMemo(() => {
    if (!content) {
      return [] as AppMission[];
    }

    return content.missions.filter((mission) => !completedMissionSlugs.includes(mission.slug)).slice(0, 3);
  }, [content, completedMissionSlugs]);
  const missionBySlug = useMemo(() => {
    if (!content) {
      return new Map<string, AppMission>();
    }

    return new Map(content.missions.map((mission) => [mission.slug, mission]));
  }, [content]);
  const lessonBySlug = useMemo(() => {
    if (!content) {
      return new Map<string, AppContent['lessons'][number]>();
    }

    return new Map(content.lessons.map((lesson) => [lesson.slug, lesson]));
  }, [content]);
  const inProgressSessions = useMemo(() => {
    return missionSessions
      .filter((session) => session.status === 'in_progress')
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .slice(0, 8);
  }, [missionSessions]);
  const recentCompletedSessions = useMemo(() => {
    return missionSessions
      .filter((session) => session.status === 'completed')
      .sort((left, right) => (right.completedAt ?? '').localeCompare(left.completedAt ?? ''))
      .slice(0, 8);
  }, [missionSessions]);

  const milestoneProgress = useMemo(() => {
    if (!content) {
      return {
        unlockedMilestones: [] as MilestoneSlug[],
        completedTrackSlugs: [] as string[],
      };
    }

    return computeMilestoneProgress({
      content,
      completedMissionSlugs,
      streakDays,
    });
  }, [content, completedMissionSlugs, streakDays]);

  const completedTrackSlugs = milestoneProgress.completedTrackSlugs;
  const shareDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const coreAchievementRows = useMemo(() => {
    const unlockedSet = new Set(unlockedCoreAchievements);
    return listAchievementDefinitions('core').map((achievement) => ({
      ...achievement,
      unlocked: unlockedSet.has(achievement.id),
    }));
  }, [unlockedCoreAchievements]);

  const funAchievementRows = useMemo(() => {
    const unlockedSet = new Set(unlockedFunAchievements);
    return listAchievementDefinitions('fun').map((achievement) => ({
      ...achievement,
      unlocked: unlockedSet.has(achievement.id),
    }));
  }, [unlockedFunAchievements]);

  const milestoneLinks = useMemo(() => {
    const date = new Date().toISOString().slice(0, 10);

    return milestoneProgress.unlockedMilestones.map((milestoneSlug) => {
      const meta = getMilestoneMeta(milestoneSlug);
      return {
        milestoneSlug,
        title: meta?.title ?? milestoneSlug,
        href: buildSharePath(milestoneSlug, {
          level,
          xp,
          date,
          badge: meta?.badge ?? milestoneSlug,
        }),
      };
    });
  }, [level, milestoneProgress.unlockedMilestones, xp]);

  const simulateMissionPass = (mission: AppMission) => {
    const gainedXp = recordMissionPass({
      missionSlug: mission.slug,
      difficulty: mission.difficulty,
      hintLevel: 0,
      attemptNumber: 1,
      completedTrackSlugs,
    });

    window.alert(t('샘플 완료 처리: +{{gainedXp}} XP', { gainedXp }));
  };

  return (
    <PagePlaceholder
      eyebrow={t('Progress')}
      title={t('학습 진행도')}
      description={t('XP, 레벨, 스트릭, 트랙별 완료 현황을 확인합니다.')}
    >
      {!content ? (
        <EmptyState
          title={t('진행 데이터를 로드할 수 없습니다')}
          description={t('콘텐츠 로드를 다시 확인해 주세요.')}
        />
      ) : (
        <div className="sim-panel">
          <div className="sim-summary">
            <p>
              <strong>{t('XP:')}</strong> {xp}
            </p>
            <p>
              <strong>{t('레벨:')}</strong> {level}
            </p>
            <p>
              <strong>{t('연속 학습:')}</strong> {streakDays}
              {t('일')}
            </p>
            <p>
              <strong>{t('완료 미션:')}</strong> {completedMissionSlugs.length}
            </p>
            <p>
              <strong>{t('pane 분할 누적:')}</strong> {tmuxSkillStats.splitCount}
            </p>
          </div>

          <section className="playbook-section">
            <h2>{t('세션 히스토리')}</h2>
            <div className="progress-session-grid">
              <article>
                <h3>{t('진행 중 세션')}</h3>
                {inProgressSessions.length === 0 ? (
                  <p className="muted">{t('진행 중인 세션이 없습니다.')}</p>
                ) : (
                  <ul className="link-list">
                    {inProgressSessions.map((session) => {
                      const mission = missionBySlug.get(session.missionSlug);
                      const lessonSlug = session.lessonSlug ?? mission?.lessonSlug ?? '';
                      const lesson = lessonBySlug.get(lessonSlug);
                      return (
                        <li key={session.id}>
                          <strong>{mission?.title ?? session.missionSlug}</strong>
                          <p className="muted">
                            {t('시작: {{startedAt}}', { startedAt: formatSessionDateTime(session.startedAt) })}
                          </p>
                          <p className="muted">{lesson?.title ?? lessonSlug}</p>
                          {lessonSlug ? (
                            <Link
                              className="secondary-btn"
                              to={`/practice?lesson=${lessonSlug}&mission=${session.missionSlug}`}
                            >
                              {t('이어서 실습')}
                            </Link>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
              <article>
                <h3>{t('최근 완료 세션')}</h3>
                {recentCompletedSessions.length === 0 ? (
                  <p className="muted">{t('완료한 세션이 없습니다.')}</p>
                ) : (
                  <ul className="link-list">
                    {recentCompletedSessions.map((session) => {
                      const mission = missionBySlug.get(session.missionSlug);
                      const lessonSlug = session.lessonSlug ?? mission?.lessonSlug ?? '';
                      const lesson = lessonBySlug.get(lessonSlug);
                      return (
                        <li key={session.id}>
                          <strong>{mission?.title ?? session.missionSlug}</strong>
                          <p className="muted">
                            {t('완료: {{completedAt}} · XP +{{gainedXp}}', {
                              completedAt: formatSessionDateTime(session.completedAt),
                              gainedXp: session.gainedXp ?? 0,
                            })}
                          </p>
                          <p className="muted">{lesson?.title ?? lessonSlug}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            </div>
          </section>

          <section className="playbook-section">
            <h2>{t('트랙 진행률')}</h2>
            <ul className="link-list">
              {trackProgress.map((track) => (
                <li key={track.trackSlug}>
                  <strong>{track.trackTitle}</strong> - {track.completedCount}/{track.totalCount} ({track.ratio}%)
                </li>
              ))}
            </ul>
          </section>

          <section className="playbook-section">
            <h2>{t('Core 업적')}</h2>
            <p className="muted">
              {t('{{unlocked}}/{{total}} 달성', {
                unlocked: unlockedCoreAchievements.length,
                total: coreAchievementRows.length,
              })}
            </p>
            <div className="achievement-grid">
              {coreAchievementRows.map((achievement) => (
                <article
                  key={achievement.id}
                  className={`achievement-card ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}`}
                >
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                  <p className="muted">{achievement.unlocked ? t('달성됨') : t('미달성')}</p>
                  {achievement.unlocked ? (
                    <a
                      className="text-link"
                      href={buildTwitterIntentUrl(
                        buildAbsoluteAchievementShareUrl(achievement.id, {
                          level,
                          xp,
                          date: shareDate,
                          badge: achievement.id,
                        }),
                        buildAchievementChallengeShareText(achievement.shareText, achievement.id),
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('X 챌린지 공유')}
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="playbook-section">
            <h2>{t('Fun 업적')}</h2>
            <p className="muted">
              {t('{{unlocked}}/{{total}} 달성', {
                unlocked: unlockedFunAchievements.length,
                total: funAchievementRows.length,
              })}
            </p>
            <ul className="link-list">
              <li>{t('pane 분할 누적: {{count}}', { count: tmuxSkillStats.splitCount })}</li>
              <li>{t('최대 pane 수: {{count}}', { count: tmuxSkillStats.maxPaneCount })}</li>
              <li>{t('window 생성: {{count}}', { count: tmuxSkillStats.newWindowCount })}</li>
              <li>{t('session 생성: {{count}}', { count: tmuxSkillStats.newSessionCount })}</li>
              <li>{t('copy-mode 진입: {{count}}', { count: tmuxSkillStats.copyModeCount })}</li>
              <li>{t('pane resize 누적: {{count}}', { count: tmuxSkillStats.paneResizeCount })}</li>
              <li>{t('pane 이동/선택 누적: {{count}}', { count: tmuxSkillStats.paneSelectCount })}</li>
              <li>{t('layout 변경 누적: {{count}}', { count: tmuxSkillStats.layoutSelectCount })}</li>
              <li>{t('zoom 토글 누적: {{count}}', { count: tmuxSkillStats.zoomToggleCount })}</li>
              <li>{t('sync 토글 누적: {{count}}', { count: tmuxSkillStats.syncToggleCount })}</li>
              <li>{t('command-prompt 실행: {{count}}', { count: tmuxSkillStats.commandPromptCount })}</li>
              <li>{t('choose-tree 실행: {{count}}', { count: tmuxSkillStats.chooseTreeCount })}</li>
            </ul>
            <div className="achievement-grid">
              {funAchievementRows.map((achievement) => (
                <article
                  key={achievement.id}
                  className={`achievement-card ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}`}
                >
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                  <p className="muted">{achievement.unlocked ? t('달성됨') : t('미달성')}</p>
                  {achievement.unlocked ? (
                    <a
                      className="text-link"
                      href={buildTwitterIntentUrl(
                        buildAbsoluteAchievementShareUrl(achievement.id, {
                          level,
                          xp,
                          date: shareDate,
                          badge: achievement.id,
                        }),
                        buildAchievementChallengeShareText(achievement.shareText, achievement.id),
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('X 챌린지 공유')}
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="playbook-section">
            <h2>{t('다음 추천 미션')}</h2>
            {recommendedMissions.length === 0 ? (
              <p className="muted">{t('모든 미션을 완료했습니다.')}</p>
            ) : (
              <ul className="link-list">
                {recommendedMissions.map((mission) => (
                  <li key={mission.slug}>
                    <strong>{mission.title}</strong> <span className="muted">({mission.difficulty})</span>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => simulateMissionPass(mission)}
                      >
                        {t('샘플 통과 처리')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="playbook-section">
            <h2>{t('마일스톤 공유')}</h2>
            {milestoneLinks.length === 0 ? (
              <p className="muted">{t('공유 가능한 마일스톤이 아직 없습니다.')}</p>
            ) : (
              <ul className="link-list">
                {milestoneLinks.map((item) => (
                  <li key={item.milestoneSlug}>
                    <Link to={item.href} className="secondary-btn">
                      {t('{{title}} 공유 페이지 열기', { title: item.title })}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PagePlaceholder>
  );
}
