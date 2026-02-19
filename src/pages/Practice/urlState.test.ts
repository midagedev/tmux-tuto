import { describe, expect, it } from 'vitest';
import rawContent from '../../content/v1/content.json';
import { parseContent } from '../../features/curriculum/contentSchema';
import { resolveInitialLessonSlugFromQuery } from './urlState';

const content = parseContent(rawContent);

describe('resolveInitialLessonSlugFromQuery', () => {
  it('uses mission lesson when only mission query is provided', () => {
    const slug = resolveInitialLessonSlugFromQuery(content, '', 'hello-tmux-session-list');
    expect(slug).toBe('hello-tmux');
  });

  it('prioritizes mission lesson when lesson and mission mismatch', () => {
    const slug = resolveInitialLessonSlugFromQuery(content, 'basics', 'hello-tmux-session-list');
    expect(slug).toBe('hello-tmux');
  });

  it('uses lesson query when mission is invalid', () => {
    const slug = resolveInitialLessonSlugFromQuery(content, 'basics', 'does-not-exist');
    expect(slug).toBe('basics');
  });

  it('falls back to first lesson when both queries are invalid', () => {
    const slug = resolveInitialLessonSlugFromQuery(content, 'x', 'y');
    expect(slug).toBe(content.lessons[0]?.slug ?? '');
  });
});
