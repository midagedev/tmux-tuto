import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { buildPracticeLessonPath, buildPracticePath } from '../../features/curriculum/practicePath';
import { useBookmarkStore } from '../../features/bookmarks/bookmarkStore';
import type { BookmarkRecord } from '../../features/storage/types';

function buildBookmarkPracticeLink(bookmark: BookmarkRecord) {
  if (bookmark.type === 'lesson') {
    return buildPracticeLessonPath(bookmark.targetId);
  }

  if (bookmark.type === 'snapshot') {
    return buildPracticePath({
      query: {
        snapshot: bookmark.targetId,
      },
    });
  }

  if (bookmark.type === 'cheatsheet_item' || bookmark.type === 'action_pattern') {
    return buildPracticePath({
      query: {
        from: bookmark.targetId,
      },
    });
  }

  return null;
}

export function BookmarksPage() {
  const { t } = useTranslation();
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

  const bookmarkTypeCount = useMemo(() => {
    return bookmarks.reduce<Record<string, number>>((accumulator, bookmark) => {
      accumulator[bookmark.type] = (accumulator[bookmark.type] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [bookmarks]);

  const topTags = useMemo(() => {
    const tagCountMap = bookmarks.reduce<Record<string, number>>((accumulator, bookmark) => {
      bookmark.tags.forEach((tag) => {
        accumulator[tag] = (accumulator[tag] ?? 0) + 1;
      });
      return accumulator;
    }, {});

    return Object.entries(tagCountMap)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
  }, [bookmarks]);

  return (
    <PagePlaceholder
      eyebrow={t('Bookmarks')}
      title={t('북마크 운영 허브')}
      description={t('북마크를 단순 저장소가 아니라 재실습 큐로 관리할 수 있도록 정리했습니다.')}
    >
      <section className="bookmark-dashboard">
        <article className="bookmark-metric-card">
          <h2>{t('저장 항목')}</h2>
          <p>
            <strong>{bookmarks.length}</strong>
            {t('개')}
          </p>
        </article>
        <article className="bookmark-metric-card">
          <h2>{t('현재 필터 결과')}</h2>
          <p>
            <strong>{filteredBookmarks.length}</strong>
            {t('개')}
          </p>
        </article>
        <article className="bookmark-metric-card">
          <h2>{t('타입 분포')}</h2>
          <p className="muted">
            {Object.entries(bookmarkTypeCount)
              .map(([bookmarkType, count]) => `${bookmarkType}: ${count}`)
              .join(' / ') || t('데이터 없음')}
          </p>
        </article>
        <article className="bookmark-metric-card">
          <h2>{t('상위 태그')}</h2>
          <p className="muted">
            {topTags.map(([tag, count]) => `${tag}(${count})`).join(', ') || t('태그 없음')}
          </p>
        </article>
      </section>

      <form
        className="bookmark-form bookmark-form-card"
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
          placeholder={t('북마크 제목')}
          aria-label={t('Bookmark title')}
        />
        <input
          className="sim-input"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          placeholder={t('대상 ID (예: mission-a-01)')}
          aria-label={t('Bookmark target id')}
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
          placeholder={t('태그 , 구분 (예: session,remote)')}
          aria-label={t('Bookmark tags')}
        />
        <button type="submit" className="primary-btn">
          {t('북마크 저장')}
        </button>
      </form>

      <div className="inline-actions bookmark-filter-row">
        <input
          className="sim-input"
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          placeholder={t('태그 필터')}
          aria-label={t('Tag filter')}
        />
        <select
          className="sim-input"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
        >
          <option value="newest">{t('최신순')}</option>
          <option value="oldest">{t('오래된순')}</option>
        </select>
      </div>

      {loading ? (
        <EmptyState title={t('로딩 중')} description={t('북마크를 불러오고 있습니다.')} />
      ) : filteredBookmarks.length === 0 ? (
        <EmptyState
          title={t('아직 저장된 항목이 없습니다')}
          description={t('실습 중 중요한 레슨/패턴을 저장하면 여기에 누적됩니다.')}
        />
      ) : (
        <div className="bookmark-list-grid">
          {filteredBookmarks.map((bookmark) => (
            <article key={bookmark.id} className="bookmark-list-card">
              <h2>
                {bookmark.title} <span className="muted">[{bookmark.type}]</span>
              </h2>
              <p className="muted">
                {t('target: {{targetId}} / tags: {{tags}}', {
                  targetId: bookmark.targetId,
                  tags: bookmark.tags.join(', ') || t('(none)'),
                })}
              </p>
              <div className="inline-actions">
                {buildBookmarkPracticeLink(bookmark) ? (
                  <Link to={buildBookmarkPracticeLink(bookmark) ?? '/practice'} className="secondary-btn">
                    {t('실습 열기')}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    void deleteBookmark(bookmark.id);
                  }}
                >
                  {t('삭제')}
                </button>
              </div>
              <textarea
                className="bookmark-note"
                value={notesByBookmarkId[bookmark.id] ?? ''}
                onChange={(event) => {
                  void saveBookmarkNote(bookmark.id, event.target.value);
                }}
                placeholder={t('개인 노트')}
                aria-label={t('Note for {{title}}', { title: bookmark.title })}
              />
            </article>
          ))}
        </div>
      )}
    </PagePlaceholder>
  );
}
