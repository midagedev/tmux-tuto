import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { EmptyState } from '../../components/system/EmptyState';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookmarkStore } from '../../features/bookmarks/bookmarkStore';
import type { BookmarkRecord } from '../../features/storage/types';

function buildBookmarkPracticeLink(bookmark: BookmarkRecord) {
  if (bookmark.type === 'lesson') {
    return `/practice?lesson=${encodeURIComponent(bookmark.targetId)}`;
  }

  if (bookmark.type === 'snapshot') {
    return `/practice?snapshot=${encodeURIComponent(bookmark.targetId)}`;
  }

  if (bookmark.type === 'cheatsheet_item' || bookmark.type === 'action_pattern') {
    return `/practice?from=${encodeURIComponent(bookmark.targetId)}`;
  }

  return null;
}

export function BookmarksPage() {
  const [title, setTitle] = useState('');
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState<'lesson' | 'mission' | 'cheatsheet_item' | 'action_pattern' | 'playbook' | 'snapshot'>(
    'lesson',
  );
  const [tagsInput, setTagsInput] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const bookmarks = useBookmarkStore((store) => store.bookmarks);
  const notesByBookmarkId = useBookmarkStore((store) => store.notesByBookmarkId);
  const loading = useBookmarkStore((store) => store.loading);
  const loadBookmarks = useBookmarkStore((store) => store.loadBookmarks);
  const createBookmark = useBookmarkStore((store) => store.createBookmark);
  const deleteBookmark = useBookmarkStore((store) => store.deleteBookmark);
  const saveBookmarkNote = useBookmarkStore((store) => store.saveBookmarkNote);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const filteredBookmarks = useMemo(() => {
    const normalizedTag = tagFilter.trim().toLowerCase();
    const base = normalizedTag
      ? bookmarks.filter((bookmark) =>
          bookmark.tags.some((tag) => tag.toLowerCase().includes(normalizedTag)),
        )
      : bookmarks;

    return [...base].sort((a, b) =>
      sortOrder === 'newest'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );
  }, [bookmarks, tagFilter, sortOrder]);

  return (
    <PagePlaceholder
      eyebrow="Bookmarks"
      title="북마크/노트"
      description="저장한 항목을 태그/정렬로 관리하고 재실습합니다."
    >
      <form
        className="bookmark-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !targetId.trim()) {
            return;
          }
          void createBookmark({
            type,
            targetId: targetId.trim(),
            title: title.trim(),
            tags: tagsInput
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          });
          setTitle('');
          setTargetId('');
          setTagsInput('');
        }}
      >
        <input
          className="sim-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="북마크 제목"
          aria-label="Bookmark title"
        />
        <input
          className="sim-input"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          placeholder="대상 ID (예: mission-a-01)"
          aria-label="Bookmark target id"
        />
        <select className="sim-input" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
          <option value="lesson">lesson</option>
          <option value="mission">mission</option>
          <option value="cheatsheet_item">cheatsheet_item</option>
          <option value="action_pattern">action_pattern</option>
          <option value="playbook">playbook</option>
          <option value="snapshot">snapshot</option>
        </select>
        <input
          className="sim-input"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="태그 , 구분 (예: session,remote)"
          aria-label="Bookmark tags"
        />
        <button type="submit" className="primary-btn">
          북마크 저장
        </button>
      </form>

      <div className="inline-actions">
        <input
          className="sim-input"
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          placeholder="태그 필터"
          aria-label="Tag filter"
        />
        <select
          className="sim-input"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
        >
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>

      {loading ? (
        <EmptyState title="로딩 중" description="북마크를 불러오고 있습니다." />
      ) : filteredBookmarks.length === 0 ? (
        <EmptyState
          title="아직 저장된 항목이 없습니다"
          description="학습 중 북마크한 레슨/플레이북이 여기에 표시됩니다."
        />
      ) : (
        <ul className="link-list">
          {filteredBookmarks.map((bookmark) => (
            <li key={bookmark.id}>
              <strong>{bookmark.title}</strong> <span className="muted">[{bookmark.type}]</span>
              <div className="muted">
                target: {bookmark.targetId} / tags: {bookmark.tags.join(', ') || '(none)'}
              </div>
              {buildBookmarkPracticeLink(bookmark) ? (
                <Link to={buildBookmarkPracticeLink(bookmark) ?? '/practice'} className="secondary-btn">
                  실습 열기
                </Link>
              ) : null}
              <textarea
                className="bookmark-note"
                value={notesByBookmarkId[bookmark.id] ?? ''}
                onChange={(event) => {
                  void saveBookmarkNote(bookmark.id, event.target.value);
                }}
                placeholder="개인 노트"
                aria-label={`Note for ${bookmark.title}`}
              />
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  void deleteBookmark(bookmark.id);
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </PagePlaceholder>
  );
}
