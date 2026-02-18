import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import { listAchievementDefinitions } from '../../features/progress';
import { useProgressStore } from '../../features/progress/progressStore';
import type { MilestoneSlug } from '../../features/sharing';
import { buildAbsoluteAchievementShareUrl, buildAchievementChallengeShareText, buildSharePath, buildTwitterIntentUrl, computeMilestoneProgress, getMilestoneMeta, } from '../../features/sharing';
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
        window.alert(__tx("\uC0D8\uD50C \uC644\uB8CC \uCC98\uB9AC: +") + gainedXp + " XP");
    };
    return (<PagePlaceholder eyebrow="Progress" title={__tx("\uD559\uC2B5 \uC9C4\uD589\uB3C4")} description={__tx("XP, \uB808\uBCA8, \uC2A4\uD2B8\uB9AD, \uD2B8\uB799\uBCC4 \uC644\uB8CC \uD604\uD669\uC744 \uD655\uC778\uD569\uB2C8\uB2E4.")}>
      {!content ? (<EmptyState title={__tx("\uC9C4\uD589 \uB370\uC774\uD130\uB97C \uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4")} description={__tx("\uCF58\uD150\uCE20 \uB85C\uB4DC\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.")}/>) : (<div className="sim-panel">
          <div className="sim-summary">
            <p>
              <strong>XP:</strong> {xp}
            </p>
            <p>
              <strong>{__tx("\uB808\uBCA8:")}</strong> {level}
            </p>
            <p>
              <strong>{__tx("\uC5F0\uC18D \uD559\uC2B5:")}</strong> {streakDays}{__tx("\uC77C")}</p>
            <p>
              <strong>{__tx("\uC644\uB8CC \uBBF8\uC158:")}</strong> {completedMissionSlugs.length}
            </p>
            <p>
              <strong>{__tx("pane \uBD84\uD560 \uB204\uC801:")}</strong> {tmuxSkillStats.splitCount}
            </p>
          </div>

          <section className="playbook-section">
            <h2>{__tx("\uC138\uC158 \uD788\uC2A4\uD1A0\uB9AC")}</h2>
            <div className="progress-session-grid">
              <article>
                <h3>{__tx("\uC9C4\uD589 \uC911 \uC138\uC158")}</h3>
                {inProgressSessions.length === 0 ? (<p className="muted">{__tx("\uC9C4\uD589 \uC911\uC778 \uC138\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.")}</p>) : (<ul className="link-list">
                    {inProgressSessions.map((session) => {
                    const mission = missionBySlug.get(session.missionSlug);
                    const lessonSlug = session.lessonSlug ?? mission?.lessonSlug ?? '';
                    const lesson = lessonBySlug.get(lessonSlug);
                    return (<li key={session.id}>
                          <strong>{mission?.title ?? session.missionSlug}</strong>
                          <p className="muted">{__tx("\uC2DC\uC791:")}{formatSessionDateTime(session.startedAt)}</p>
                          <p className="muted">{lesson?.title ?? lessonSlug}</p>
                          {lessonSlug ? (<Link className="secondary-btn" to={`/practice?lesson=${lessonSlug}&mission=${session.missionSlug}`}>{__tx("\uC774\uC5B4\uC11C \uC2E4\uC2B5")}</Link>) : null}
                        </li>);
                })}
                  </ul>)}
              </article>
              <article>
                <h3>{__tx("\uCD5C\uADFC \uC644\uB8CC \uC138\uC158")}</h3>
                {recentCompletedSessions.length === 0 ? (<p className="muted">{__tx("\uC644\uB8CC\uD55C \uC138\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.")}</p>) : (<ul className="link-list">
                    {recentCompletedSessions.map((session) => {
                    const mission = missionBySlug.get(session.missionSlug);
                    const lessonSlug = session.lessonSlug ?? mission?.lessonSlug ?? '';
                    const lesson = lessonBySlug.get(lessonSlug);
                    return (<li key={session.id}>
                          <strong>{mission?.title ?? session.missionSlug}</strong>
                          <p className="muted">{__tx("\uC644\uB8CC:")}{formatSessionDateTime(session.completedAt)} · XP +
                            {session.gainedXp ?? 0}
                          </p>
                          <p className="muted">{lesson?.title ?? lessonSlug}</p>
                        </li>);
                })}
                  </ul>)}
              </article>
            </div>
          </section>

          <section className="playbook-section">
            <h2>{__tx("\uD2B8\uB799 \uC9C4\uD589\uB960")}</h2>
            <ul className="link-list">
              {trackProgress.map((track) => (<li key={track.trackSlug}>
                  <strong>{track.trackTitle}</strong> - {track.completedCount}/{track.totalCount} ({track.ratio}%)
                </li>))}
            </ul>
          </section>

          <section className="playbook-section">
            <h2>{__tx("Core \uC5C5\uC801")}</h2>
            <p className="muted">
              {unlockedCoreAchievements.length}/{coreAchievementRows.length}{__tx("\uB2EC\uC131")}</p>
            <div className="achievement-grid">
              {coreAchievementRows.map((achievement) => (<article key={achievement.id} className={`achievement-card ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}`}>
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                  <p className="muted">{achievement.unlocked ? __tx("\uB2EC\uC131\uB428") : __tx("\uBBF8\uB2EC\uC131")}</p>
                  {achievement.unlocked ? (<a className="text-link" href={buildTwitterIntentUrl(buildAbsoluteAchievementShareUrl(achievement.id, {
                        level,
                        xp,
                        date: shareDate,
                        badge: achievement.id,
                    }), buildAchievementChallengeShareText(achievement.shareText, achievement.id))} target="_blank" rel="noreferrer">{__tx("X \uCC4C\uB9B0\uC9C0 \uACF5\uC720")}</a>) : null}
                </article>))}
            </div>
          </section>

          <section className="playbook-section">
            <h2>{__tx("Fun \uC5C5\uC801")}</h2>
            <p className="muted">
              {unlockedFunAchievements.length}/{funAchievementRows.length}{__tx("\uB2EC\uC131")}</p>
            <ul className="link-list">
              <li>{__tx("pane \uBD84\uD560 \uB204\uC801:")}{tmuxSkillStats.splitCount}</li>
              <li>{__tx("\uCD5C\uB300 pane \uC218:")}{tmuxSkillStats.maxPaneCount}</li>
              <li>{__tx("window \uC0DD\uC131:")}{tmuxSkillStats.newWindowCount}</li>
              <li>{__tx("session \uC0DD\uC131:")}{tmuxSkillStats.newSessionCount}</li>
              <li>{__tx("copy-mode \uC9C4\uC785:")}{tmuxSkillStats.copyModeCount}</li>
              <li>{__tx("pane resize \uB204\uC801:")}{tmuxSkillStats.paneResizeCount}</li>
              <li>{__tx("pane \uC774\uB3D9/\uC120\uD0DD \uB204\uC801:")}{tmuxSkillStats.paneSelectCount}</li>
              <li>{__tx("layout \uBCC0\uACBD \uB204\uC801:")}{tmuxSkillStats.layoutSelectCount}</li>
              <li>{__tx("zoom \uD1A0\uAE00 \uB204\uC801:")}{tmuxSkillStats.zoomToggleCount}</li>
              <li>{__tx("sync \uD1A0\uAE00 \uB204\uC801:")}{tmuxSkillStats.syncToggleCount}</li>
              <li>{__tx("command-prompt \uC2E4\uD589:")}{tmuxSkillStats.commandPromptCount}</li>
              <li>{__tx("choose-tree \uC2E4\uD589:")}{tmuxSkillStats.chooseTreeCount}</li>
            </ul>
            <div className="achievement-grid">
              {funAchievementRows.map((achievement) => (<article key={achievement.id} className={`achievement-card ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}`}>
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                  <p className="muted">{achievement.unlocked ? __tx("\uB2EC\uC131\uB428") : __tx("\uBBF8\uB2EC\uC131")}</p>
                  {achievement.unlocked ? (<a className="text-link" href={buildTwitterIntentUrl(buildAbsoluteAchievementShareUrl(achievement.id, {
                        level,
                        xp,
                        date: shareDate,
                        badge: achievement.id,
                    }), buildAchievementChallengeShareText(achievement.shareText, achievement.id))} target="_blank" rel="noreferrer">{__tx("X \uCC4C\uB9B0\uC9C0 \uACF5\uC720")}</a>) : null}
                </article>))}
            </div>
          </section>

          <section className="playbook-section">
            <h2>{__tx("\uB2E4\uC74C \uCD94\uCC9C \uBBF8\uC158")}</h2>
            {recommendedMissions.length === 0 ? (<p className="muted">{__tx("\uBAA8\uB4E0 \uBBF8\uC158\uC744 \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4.")}</p>) : (<ul className="link-list">
                {recommendedMissions.map((mission) => (<li key={mission.slug}>
                    <strong>{mission.title}</strong> <span className="muted">({mission.difficulty})</span>
                    <div className="inline-actions">
                      <button type="button" className="secondary-btn" onClick={() => simulateMissionPass(mission)}>{__tx("\uC0D8\uD50C \uD1B5\uACFC \uCC98\uB9AC")}</button>
                    </div>
                  </li>))}
              </ul>)}
          </section>

          <section className="playbook-section">
            <h2>{__tx("\uB9C8\uC77C\uC2A4\uD1A4 \uACF5\uC720")}</h2>
            {milestoneLinks.length === 0 ? (<p className="muted">{__tx("\uACF5\uC720 \uAC00\uB2A5\uD55C \uB9C8\uC77C\uC2A4\uD1A4\uC774 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4.")}</p>) : (<ul className="link-list">
                {milestoneLinks.map((item) => (<li key={item.milestoneSlug}>
                    <Link to={item.href} className="secondary-btn">
                      {item.title}{__tx("\uACF5\uC720 \uD398\uC774\uC9C0 \uC5F4\uAE30")}</Link>
                  </li>))}
              </ul>)}
          </section>
        </div>)}
    </PagePlaceholder>);
}
