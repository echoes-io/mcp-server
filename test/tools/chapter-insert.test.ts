import type { Tracker } from '@echoes-io/tracker';
import { describe, expect, it, vi } from 'vitest';

import { chapterInsert, chapterInsertSchema } from '../../lib/tools/chapter-insert.js';

describe('chapter-insert tool', () => {
  it('should insert chapter and renumber subsequent chapters', async () => {
    // Mock episode and existing chapters
    const mockEpisode = { number: 1, title: 'Test Episode' };
    const mockChapters = [
      { number: 1, title: 'Chapter 1', pov: 'Alice' },
      { number: 2, title: 'Chapter 2', pov: 'Bob' },
      { number: 3, title: 'Chapter 3', pov: 'Alice' },
      { number: 4, title: 'Chapter 4', pov: 'Bob' },
    ];

    const mockTracker = {
      getEpisode: vi.fn().mockResolvedValue(mockEpisode),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
      updateChapter: vi.fn().mockResolvedValue(undefined),
      createChapter: vi.fn().mockResolvedValue(undefined),
    } as unknown as Tracker;

    const result = await chapterInsert(
      {
        timeline: 'test-timeline',
        arc: 'test-arc',
        episode: 1,
        after: 2,
        pov: 'Charlie',
        title: 'New Chapter',
        excerpt: 'A new chapter',
        location: 'Castle',
      },
      mockTracker,
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const info = JSON.parse(result.content[0].text);
    expect(info.inserted.chapter).toBe(3);
    expect(info.inserted.pov).toBe('Charlie');
    expect(info.inserted.title).toBe('New Chapter');
    expect(info.renumbered).toHaveLength(2);
    expect(info.renumbered[0]).toEqual({ old: 3, new: 4, title: 'Chapter 3' });
    expect(info.renumbered[1]).toEqual({ old: 4, new: 5, title: 'Chapter 4' });
    expect(info.summary.chaptersRenumbered).toBe(2);
    expect(info.warning).toContain('Remember to rename corresponding files');

    // Verify renumbering happened from high to low
    expect(mockTracker.updateChapter).toHaveBeenCalledTimes(2);
    expect(mockTracker.createChapter).toHaveBeenCalledWith(
      expect.objectContaining({
        number: 3,
        pov: 'Charlie',
        title: 'New Chapter',
      }),
    );
  });

  it('should insert at end without renumbering', async () => {
    const mockEpisode = { number: 1, title: 'Test Episode' };
    const mockChapters = [
      { number: 1, title: 'Chapter 1' },
      { number: 2, title: 'Chapter 2' },
    ];

    const mockTracker = {
      getEpisode: vi.fn().mockResolvedValue(mockEpisode),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
      updateChapter: vi.fn(),
      createChapter: vi.fn().mockResolvedValue(undefined),
    } as unknown as Tracker;

    const result = await chapterInsert(
      {
        timeline: 'test-timeline',
        arc: 'test-arc',
        episode: 1,
        after: 2,
        pov: 'Alice',
        title: 'Final Chapter',
      },
      mockTracker,
    );

    const info = JSON.parse(result.content[0].text);
    expect(info.inserted.chapter).toBe(3);
    expect(info.renumbered).toHaveLength(0);
    expect(info.summary.chaptersRenumbered).toBe(0);
    expect(info.warning).toBeUndefined();

    expect(mockTracker.updateChapter).not.toHaveBeenCalled();
  });

  it('should handle missing episode', async () => {
    const mockTracker = {
      getEpisode: vi.fn().mockResolvedValue(null),
      getChapters: vi.fn(),
      updateChapter: vi.fn(),
      createChapter: vi.fn(),
    } as unknown as Tracker;

    await expect(
      chapterInsert(
        {
          timeline: 'test-timeline',
          arc: 'test-arc',
          episode: 999,
          after: 1,
          pov: 'Alice',
          title: 'Test',
        },
        mockTracker,
      ),
    ).rejects.toThrow('Episode not found');

    expect(mockTracker.getChapters).not.toHaveBeenCalled();
  });

  it('should handle renumbering errors', async () => {
    const mockEpisode = { number: 1, title: 'Test Episode' };
    const mockChapters = [
      { number: 1, title: 'Chapter 1' },
      { number: 2, title: 'Chapter 2' },
    ];

    const mockTracker = {
      getEpisode: vi.fn().mockResolvedValue(mockEpisode),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
      updateChapter: vi.fn().mockRejectedValue(new Error('Update failed')),
      createChapter: vi.fn(),
    } as unknown as Tracker;

    await expect(
      chapterInsert(
        {
          timeline: 'test-timeline',
          arc: 'test-arc',
          episode: 1,
          after: 1,
          pov: 'Alice',
          title: 'Test',
        },
        mockTracker,
      ),
    ).rejects.toThrow('Failed to renumber chapter 2');
  });

  it('should validate input schema', () => {
    expect(() =>
      chapterInsertSchema.parse({
        timeline: 'test',
        arc: 'test',
        episode: 1,
        after: 1,
        pov: 'Alice',
        title: 'Test Chapter',
      }),
    ).not.toThrow();

    expect(() => chapterInsertSchema.parse({})).toThrow();
    expect(() =>
      chapterInsertSchema.parse({
        timeline: 'test',
        arc: 'test',
        episode: 'invalid',
      }),
    ).toThrow();
  });
});
