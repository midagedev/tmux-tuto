import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { buildAbsoluteShareUrl, buildTwitterIntentUrl, decodeSharePayload, getMilestoneMeta, isMilestoneSlug, } from '../../features/sharing';
import { useProgressStore } from '../../features/progress/progressStore';
import { copyTextToClipboard } from '../../utils/clipboard';
export function ShareMilestonePage() {
    const { milestoneSlug } = useParams();
    const [searchParams] = useSearchParams();
    const [alias, setAlias] = useState('');
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const level = useProgressStore((store) => store.level);
    const xp = useProgressStore((store) => store.xp);
    const streakDays = useProgressStore((store) => store.streakDays);
    const milestone = milestoneSlug ? getMilestoneMeta(milestoneSlug) : null;
    const decodedPayload = decodeSharePayload(searchParams.get('d'));
    const effectivePayload = useMemo(() => ({
        name: alias.trim() || decodedPayload?.name || 'learner',
        level: decodedPayload?.level ?? level,
        xp: decodedPayload?.xp ?? xp,
        date: decodedPayload?.date ?? new Date().toISOString().slice(0, 10),
        badge: decodedPayload?.badge ?? milestone?.badge ?? 'milestone',
    }), [alias, decodedPayload, level, milestone?.badge, xp]);
    const shareUrl = milestoneSlug && isMilestoneSlug(milestoneSlug)
        ? buildAbsoluteShareUrl(milestoneSlug, effectivePayload)
        : window.location.href;
    const shareMessage = milestone
        ? `${milestone.title}: ${milestone.description}`
        : __tx("tmux \uD559\uC2B5 \uB9C8\uC77C\uC2A4\uD1A4\uC744 \uACF5\uC720\uD569\uB2C8\uB2E4.");
    const payloadBroken = Boolean(searchParams.get('d')) && !decodedPayload;
    if (!milestone) {
        return (<PagePlaceholder eyebrow="Share" title={__tx("\uC54C \uC218 \uC5C6\uB294 \uB9C8\uC77C\uC2A4\uD1A4")} description={__tx("\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uACF5\uC720 \uACBD\uB85C\uC785\uB2C8\uB2E4. Progress \uD398\uC774\uC9C0\uC5D0\uC11C \uB2E4\uC2DC \uC0DD\uC131\uD574 \uC8FC\uC138\uC694.")}>
        <div className="inline-actions">
          <Link to="/progress" className="primary-btn">
            Progress로 이동
          </Link>
        </div>
      </PagePlaceholder>);
    }
    return (<PagePlaceholder eyebrow="Share" title={milestone.title} description={milestone.description}>
      <div className="share-preview-card">
        <p className="page-eyebrow">Preview</p>
        <h2>{milestone.title}</h2>
        <p>{milestone.description}</p>
        <ul className="link-list">
          <li>닉네임: {effectivePayload.name}</li>
          <li>레벨: {effectivePayload.level}</li>
          <li>XP: {effectivePayload.xp}</li>
          <li>연속 학습일: {streakDays}</li>
          <li>달성일: {effectivePayload.date}</li>
        </ul>
      </div>

      <section className="onboarding-card">
        <h2>{__tx("\uACF5\uC720 \uC124\uC815")}</h2>
        <p className="muted">{__tx("\uB2C9\uB124\uC784\uC740 \uC120\uD0DD\uAC12\uC774\uBA70 \uAC1C\uC778 \uC2DD\uBCC4 \uC815\uBCF4 \uC785\uB825\uC740 \uAD8C\uC7A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.")}</p>
        <div className="inline-actions">
          <input className="sim-input" value={alias} onChange={(event) => setAlias(event.target.value)} placeholder={__tx("\uB2C9\uB124\uC784 (\uC120\uD0DD)")} aria-label="Share nickname"/>
          <button type="button" className="secondary-btn" onClick={() => {
            copyTextToClipboard(shareUrl)
                .then(() => setCopyStatus(__tx("\uACF5\uC720 \uB9C1\uD06C\uB97C \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.")))
                .catch(() => setCopyStatus(__tx("\uD074\uB9BD\uBCF4\uB4DC \uBCF5\uC0AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.")));
        }}>
            링크 복사
          </button>
          <a className="primary-btn" href={buildTwitterIntentUrl(shareUrl, shareMessage)} target="_blank" rel="noreferrer">
            X에서 공유
          </a>
        </div>
        {copyStatus ? (<p className="muted" role="status" aria-live="polite">
            {copyStatus}
          </p>) : null}
        {payloadBroken ? (<p className="muted">{__tx("payload\uAC00 \uD30C\uC190\uB418\uC5B4 \uAE30\uBCF8\uAC12\uC73C\uB85C \uB80C\uB354\uB9C1\uD588\uC2B5\uB2C8\uB2E4.")}</p>) : null}
      </section>

      <section className="onboarding-card">
        <h2>{__tx("\uACF5\uC720 URL")}</h2>
        <p className="muted">{shareUrl}</p>
      </section>
    </PagePlaceholder>);
}
