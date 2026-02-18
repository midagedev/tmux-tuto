import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { getAchievementDefinition } from '../../features/progress';
import { useProgressStore } from '../../features/progress/progressStore';
import {
  buildAbsoluteAchievementShareUrl,
  buildAchievementChallengeShareText,
  buildTwitterIntentUrl,
  decodeSharePayload,
  isAchievementShareId,
  resolveAchievementShareTarget,
} from '../../features/sharing';
import { copyTextToClipboard } from '../../utils/clipboard';

export function ShareAchievementPage() {
  const { achievementId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [alias, setAlias] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const level = useProgressStore((store) => store.level);
  const xp = useProgressStore((store) => store.xp);
  const streakDays = useProgressStore((store) => store.streakDays);

  const achievement = isAchievementShareId(achievementId) ? getAchievementDefinition(achievementId) : null;
  const decodedPayload = decodeSharePayload(searchParams.get('d'));

  const effectivePayload = useMemo(
    () => ({
      name: alias.trim() || decodedPayload?.name || 'learner',
      level: decodedPayload?.level ?? level,
      xp: decodedPayload?.xp ?? xp,
      date: decodedPayload?.date ?? new Date().toISOString().slice(0, 10),
      badge: decodedPayload?.badge ?? achievement?.id ?? 'achievement',
    }),
    [achievement?.id, alias, decodedPayload, level, xp],
  );

  const shareUrl = achievement
    ? buildAbsoluteAchievementShareUrl(achievement.id, effectivePayload)
    : window.location.href;
  const shareMessage = achievement
    ? buildAchievementChallengeShareText(achievement.shareText, achievement.id)
    : 'tmux-tuto 업적 챌린지를 공유합니다.';
  const challengeTarget = achievement ? resolveAchievementShareTarget(achievement.id) : null;
  const payloadBroken = Boolean(searchParams.get('d')) && !decodedPayload;

  if (!achievement) {
    return (
      <PagePlaceholder
        eyebrow="Share"
        title="알 수 없는 업적 공유 링크"
        description="지원하지 않는 업적 공유 경로입니다."
      >
        <div className="inline-actions">
          <Link to="/progress" className="primary-btn">
            Progress로 이동
          </Link>
        </div>
      </PagePlaceholder>
    );
  }

  return (
    <PagePlaceholder eyebrow="Share" title={achievement.title} description={achievement.description}>
      <div className="share-preview-card">
        <p className="page-eyebrow">Achievement Challenge</p>
        <h2>{achievement.title}</h2>
        <p>{achievement.description}</p>
        <ul className="link-list">
          <li>닉네임: {effectivePayload.name}</li>
          <li>레벨: {effectivePayload.level}</li>
          <li>XP: {effectivePayload.xp}</li>
          <li>연속 학습일: {streakDays}</li>
          <li>달성일: {effectivePayload.date}</li>
          <li>추천 챌린지: {challengeTarget?.challengeLabel ?? '첫 3분: tmux 맛보기'}</li>
        </ul>
        <div className="inline-actions">
          <Link className="primary-btn" to={challengeTarget?.path ?? '/practice?lesson=hello-tmux&mission=hello-tmux-version-check'}>
            챌린지 시작
          </Link>
        </div>
      </div>

      <section className="onboarding-card">
        <h2>공유 설정</h2>
        <p className="muted">닉네임은 선택값이며 개인 식별 정보 입력은 권장하지 않습니다.</p>
        <div className="inline-actions">
          <input
            className="sim-input"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="닉네임 (선택)"
            aria-label="Share nickname"
          />
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              copyTextToClipboard(shareUrl)
                .then(() => setCopyStatus('공유 링크를 복사했습니다.'))
                .catch(() => setCopyStatus('클립보드 복사에 실패했습니다.'));
            }}
          >
            링크 복사
          </button>
          <a className="primary-btn" href={buildTwitterIntentUrl(shareUrl, shareMessage)} target="_blank" rel="noreferrer">
            X에서 공유
          </a>
        </div>
        {copyStatus ? (
          <p className="muted" role="status" aria-live="polite">
            {copyStatus}
          </p>
        ) : null}
        {payloadBroken ? (
          <p className="muted">payload가 파손되어 기본값으로 렌더링했습니다.</p>
        ) : null}
      </section>
    </PagePlaceholder>
  );
}
