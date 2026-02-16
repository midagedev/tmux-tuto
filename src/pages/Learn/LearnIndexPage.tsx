import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useEffect, useState } from 'react';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import { EmptyState } from '../../components/system/EmptyState';
import type { AppTrack } from '../../features/curriculum/contentSchema';

export function LearnIndexPage() {
  const [tracks, setTracks] = useState<AppTrack[]>([]);

  useEffect(() => {
    loadAppContent()
      .then((content) => {
        setTracks(content.tracks.filter((track) => track.status === 'active'));
      })
      .catch(() => {
        setTracks([]);
      });
  }, []);

  return (
    <PagePlaceholder
      eyebrow="Learn"
      title="Track A~C"
      description="Track A~C 콘텐츠 목록과 진행률을 표시합니다."
    >
      {tracks.length === 0 ? (
        <EmptyState title="로드된 트랙이 없습니다" description="콘텐츠 파일을 확인해 주세요." />
      ) : (
        <ul className="link-list">
          {tracks.map((track) => (
            <li key={track.id}>
              <strong>{track.title}</strong>
              <div className="muted">{track.summary}</div>
            </li>
          ))}
        </ul>
      )}
    </PagePlaceholder>
  );
}
