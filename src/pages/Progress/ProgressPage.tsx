import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import { useProgressStore } from '../../features/progress/progressStore';
import type { MilestoneSlug } from '../../features/sharing';
import { buildSharePath, getMilestoneMeta } from '../../features/sharing';

export function ProgressPage() {
  const [content, setContent] = useState<AppContent | null>(null);

  const xp = useProgressStore((store) => store.xp);
  const level = useProgressStore((store) => store.level);
  const streakDays = useProgressStore((store) => store.streakDays);
  const completedMissionSlugs = useProgressStore((store) => store.completedMissionSlugs);
  const unlockedAchievements = useProgressStore((store) => store.unlockedAchievements);
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

  const completedTrackSlugs = useMemo(
    () => trackProgress.filter((row) => row.ratio >= 100).map((row) => row.trackSlug),
    [trackProgress],
  );

  const milestoneLinks = useMemo(() => {
    const milestoneSet = new Set<MilestoneSlug>();

    if (completedMissionSlugs.length >= 1) {
      milestoneSet.add('first-chapter-complete');
    }
    if (completedTrackSlugs.includes('track-a-foundations')) {
      milestoneSet.add('track-a-complete');
    }
    if (completedTrackSlugs.includes('track-b-workflow')) {
      milestoneSet.add('track-b-complete');
    }
    if (completedTrackSlugs.includes('track-c-deepwork')) {
      milestoneSet.add('track-c-complete');
    }
    if (streakDays >= 7) {
      milestoneSet.add('streak-7');
    }
    if (
      completedTrackSlugs.includes('track-a-foundations') &&
      completedTrackSlugs.includes('track-b-workflow') &&
      completedTrackSlugs.includes('track-c-deepwork')
    ) {
      milestoneSet.add('final-complete');
    }

    const date = new Date().toISOString().slice(0, 10);

    return Array.from(milestoneSet).map((milestoneSlug) => {
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
  }, [completedMissionSlugs.length, completedTrackSlugs, level, streakDays, xp]);

  const simulateMissionPass = (mission: AppMission) => {
    const gainedXp = recordMissionPass({
      missionSlug: mission.slug,
      difficulty: mission.difficulty,
      hintLevel: 0,
      attemptNumber: 1,
      completedTrackSlugs,
    });

    window.alert(`Simulated pass: +${gainedXp} XP`);
  };

  return (
    <PagePlaceholder
      eyebrow="Progress"
      title="학습 진행도"
      description="XP, 레벨, 스트릭, 트랙별 완료 현황을 확인합니다."
    >
      {!content ? (
        <EmptyState title="진행 데이터를 로드할 수 없습니다" description="콘텐츠 로드를 다시 확인해 주세요." />
      ) : (
        <div className="sim-panel">
          <div className="sim-summary">
            <p>
              <strong>XP:</strong> {xp}
            </p>
            <p>
              <strong>Level:</strong> {level}
            </p>
            <p>
              <strong>Streak:</strong> {streakDays} days
            </p>
            <p>
              <strong>Completed Missions:</strong> {completedMissionSlugs.length}
            </p>
          </div>

          <section className="playbook-section">
            <h2>Track Progress</h2>
            <ul className="link-list">
              {trackProgress.map((track) => (
                <li key={track.trackSlug}>
                  <strong>{track.trackTitle}</strong> - {track.completedCount}/{track.totalCount} ({track.ratio}%)
                </li>
              ))}
            </ul>
          </section>

          <section className="playbook-section">
            <h2>Achievements</h2>
            {unlockedAchievements.length === 0 ? (
              <p className="muted">아직 해금된 업적이 없습니다.</p>
            ) : (
              <ul className="link-list">
                {unlockedAchievements.map((achievement) => (
                  <li key={achievement}>{achievement}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="playbook-section">
            <h2>Recommended Missions</h2>
            {recommendedMissions.length === 0 ? (
              <p className="muted">모든 미션을 완료했습니다.</p>
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
                        샘플 통과 처리
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="playbook-section">
            <h2>Share Milestones</h2>
            {milestoneLinks.length === 0 ? (
              <p className="muted">공유 가능한 마일스톤이 아직 없습니다.</p>
            ) : (
              <ul className="link-list">
                {milestoneLinks.map((item) => (
                  <li key={item.milestoneSlug}>
                    <Link to={item.href} className="secondary-btn">
                      {item.title} 공유 페이지 열기
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
