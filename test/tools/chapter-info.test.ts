import { Tracker } from '@echoes-io/tracker';
import { describe, expect, it, vi } from 'vitest';

import { chapterInfo, chapterInfoSchema } from '../../lib/tools/chapter-info.js';

describe('chapter-info tool', () => {
  it('should get chapter info from database', async () => {
    // Create a mock tracker that returns a chapter
    const mockTracker = {
      init: vi.fn(),
      close: vi.fn(),
      getChapter: vi.fn().mockResolvedValue({
        pov: 'TestPOV',
        title: 'Test Chapter',
        date: new Date('2024-01-01'),
        excerpt: 'Test excerpt',
        location: 'Test location',
        outfit: 'Test outfit',
        kink: 'Test kink',
        words: 150,
        characters: 750,
        charactersNoSpaces: 600,
        paragraphs: 3,
        sentences: 8,
      }),
    } as unknown as Tracker;

    const result = await chapterInfo(
      {
        timeline: 'test-timeline',
        arc: 'test-arc',
        episode: 1,
        chapter: 1,
      },
      mockTracker,
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const info = JSON.parse(result.content[0].text);
    expect(info.timeline).toBe('test-timeline');
    expect(info.arc).toBe('test-arc');
    expect(info.episode).toBe(1);
    expect(info.chapter).toBe(1);
    expect(info.metadata.pov).toBe('TestPOV');
    expect(info.metadata.title).toBe('Test Chapter');
    expect(info.stats.words).toBe(150);
    expect(info.stats.characters).toBe(750);

    expect(mockTracker.getChapter).toHaveBeenCalledWith('test-timeline', 'test-arc', 1, 1);
  });

  it('should validate input schema', () => {
    expect(() =>
      chapterInfoSchema.parse({
        timeline: 'test-timeline',
        arc: 'test-arc',
        episode: 1,
        chapter: 1,
      }),
    ).not.toThrow();
    expect(() => chapterInfoSchema.parse({})).toThrow();
  });

  it('should handle missing chapter gracefully', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    await expect(
      chapterInfo(
        {
          timeline: 'nonexistent',
          arc: 'nonexistent',
          episode: 1,
          chapter: 1,
        },
        tracker,
      ),
    ).rejects.toThrow('Chapter not found');

    await tracker.close();
  });
});
