import { describe, expect, it } from 'vitest';
import { clearContentCache, loadAppContent } from './contentLoader';

describe('content loader integration', () => {
  it('loads and validates curriculum content', async () => {
    clearContentCache();
    const content = await loadAppContent();

    expect(content.version).toBeTruthy();
    expect(content.tracks.length).toBeGreaterThanOrEqual(3);
    expect(content.playbooks.length).toBeGreaterThanOrEqual(3);
  });

  it('returns cached content instance between calls', async () => {
    clearContentCache();
    const first = await loadAppContent();
    const second = await loadAppContent();

    expect(second).toBe(first);
  });
});
