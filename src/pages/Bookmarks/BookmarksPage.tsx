import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
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
    const [type, setType] = useState<'lesson' | 'mission' | 'cheatsheet_item' | 'action_pattern' | 'playbook' | 'snapshot'>('lesson');
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
            ? bookmarks.filter((bookmark) => bookmark.tags.some((tag) => tag.toLowerCase().includes(normalizedTag)))
            : bookmarks;
        return [...base].sort((a, b) => sortOrder === 'newest'
            ? b.createdAt.localeCompare(a.createdAt)
            : a.createdAt.localeCompare(b.createdAt));
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
    return (<PagePlaceholder eyebrow="Bookmarks" title={__tx("\uBD81\uB9C8\uD06C \uC6B4\uC601 \uD5C8\uBE0C")} description={__tx("\uBD81\uB9C8\uD06C\uB97C \uB2E8\uC21C \uC800\uC7A5\uC18C\uAC00 \uC544\uB2C8\uB77C \uC7AC\uC2E4\uC2B5 \uD050\uB85C \uAD00\uB9AC\uD560 \uC218 \uC788\uB3C4\uB85D \uC815\uB9AC\uD588\uC2B5\uB2C8\uB2E4.")}>
      <section className="bookmark-dashboard">
        <article className="bookmark-metric-card">
          <h2>{__tx("\uC800\uC7A5 \uD56D\uBAA9")}</h2>
          <p>
            <strong>{bookmarks.length}</strong>개
          </p>
        </article>
        <article className="bookmark-metric-card">
          <h2>{__tx("\uD604\uC7AC \uD544\uD130 \uACB0\uACFC")}</h2>
          <p>
            <strong>{filteredBookmarks.length}</strong>개
          </p>
        </article>
        <article className="bookmark-metric-card">
          <h2>{__tx("\uD0C0\uC785 \uBD84\uD3EC")}</h2>
          <p className="muted">
            {Object.entries(bookmarkTypeCount)
            .map(([bookmarkType, count]) => `${bookmarkType}: ${count}`)
            .join(' / ') || __tx("\uB370\uC774\uD130 \uC5C6\uC74C")}
          </p>
        </article>
        <article className="bookmark-metric-card">
          <h2>{__tx("\uC0C1\uC704 \uD0DC\uADF8")}</h2>
          <p className="muted">
            {topTags.map(([tag, count]) => `${tag}(${count})`).join(', ') || __tx("\uD0DC\uADF8 \uC5C6\uC74C")}
          </p>
        </article>
      </section>

      <form className="bookmark-form bookmark-form-card" onSubmit={(event) => {
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
        }}>
        <input className="sim-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={__tx("\uBD81\uB9C8\uD06C \uC81C\uBAA9")} aria-label="Bookmark title"/>
        <input className="sim-input" value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder={__tx("\uB300\uC0C1 ID (\uC608: mission-a-01)")} aria-label="Bookmark target id"/>
        <select className="sim-input" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
          <option value="lesson">lesson</option>
          <option value="mission">mission</option>
          <option value="cheatsheet_item">cheatsheet_item</option>
          <option value="action_pattern">action_pattern</option>
          <option value="playbook">playbook</option>
          <option value="snapshot">snapshot</option>
        </select>
        <input className="sim-input" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder={__tx("\uD0DC\uADF8 , \uAD6C\uBD84 (\uC608: session,remote)")} aria-label="Bookmark tags"/>
        <button type="submit" className="primary-btn">
          북마크 저장
        </button>
      </form>

      <div className="inline-actions bookmark-filter-row">
        <input className="sim-input" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder={__tx("\uD0DC\uADF8 \uD544\uD130")} aria-label="Tag filter"/>
        <select className="sim-input" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
          <option value="newest">{__tx("\uCD5C\uC2E0\uC21C")}</option>
          <option value="oldest">{__tx("\uC624\uB798\uB41C\uC21C")}</option>
        </select>
      </div>

      {loading ? (<EmptyState title={__tx("\uB85C\uB529 \uC911")} description={__tx("\uBD81\uB9C8\uD06C\uB97C \uBD88\uB7EC\uC624\uACE0 \uC788\uC2B5\uB2C8\uB2E4.")}/>) : filteredBookmarks.length === 0 ? (<EmptyState title={__tx("\uC544\uC9C1 \uC800\uC7A5\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4")} description={__tx("\uC2E4\uC2B5 \uC911 \uC911\uC694\uD55C \uB808\uC2A8/\uD328\uD134\uC744 \uC800\uC7A5\uD558\uBA74 \uC5EC\uAE30\uC5D0 \uB204\uC801\uB429\uB2C8\uB2E4.")}/>) : (<div className="bookmark-list-grid">
          {filteredBookmarks.map((bookmark) => (<article key={bookmark.id} className="bookmark-list-card">
              <h2>
                {bookmark.title} <span className="muted">[{bookmark.type}]</span>
              </h2>
              <p className="muted">
                target: {bookmark.targetId} / tags: {bookmark.tags.join(', ') || '(none)'}
              </p>
              <div className="inline-actions">
                {buildBookmarkPracticeLink(bookmark) ? (<Link to={buildBookmarkPracticeLink(bookmark) ?? '/practice'} className="secondary-btn">
                    실습 열기
                  </Link>) : null}
                <button type="button" className="secondary-btn" onClick={() => {
                    void deleteBookmark(bookmark.id);
                }}>
                  삭제
                </button>
              </div>
              <textarea className="bookmark-note" value={notesByBookmarkId[bookmark.id] ?? ''} onChange={(event) => {
                    void saveBookmarkNote(bookmark.id, event.target.value);
                }} placeholder={__tx("\uAC1C\uC778 \uB178\uD2B8")} aria-label={`Note for ${bookmark.title}`}/>
            </article>))}
        </div>)}
    </PagePlaceholder>);
}
